"""
Utility Functions
=================
Common utilities for connector development and operation.
"""

import asyncio
import hashlib
import hmac
import time
import logging
from typing import Dict, Any, Optional, Callable, TypeVar, List
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

T = TypeVar('T')


# =============================================================================
# Rate Limiting
# =============================================================================

class RateLimiter:
    """
    Token bucket rate limiter for API calls.
    
    Usage:
        limiter = RateLimiter(requests_per_second=10)
        
        async with limiter:
            await make_api_call()
    """
    
    def __init__(
        self,
        requests_per_second: float = 10,
        burst_size: int = None
    ):
        self.rate = requests_per_second
        self.burst_size = burst_size or int(requests_per_second * 2)
        self.tokens = self.burst_size
        self.last_update = time.monotonic()
        self._lock = asyncio.Lock()
    
    async def acquire(self):
        """Acquire a token, waiting if necessary"""
        async with self._lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.burst_size, self.tokens + elapsed * self.rate)
            self.last_update = now
            
            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1
    
    async def __aenter__(self):
        await self.acquire()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class SlidingWindowRateLimiter:
    """
    Sliding window rate limiter with Redis-like behavior.
    
    Usage:
        limiter = SlidingWindowRateLimiter(max_requests=100, window_seconds=60)
        
        if await limiter.is_allowed("user_123"):
            await make_api_call()
        else:
            raise RateLimitError("Too many requests")
    """
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._requests: Dict[str, List[float]] = {}
        self._lock = asyncio.Lock()
    
    async def is_allowed(self, key: str) -> bool:
        """Check if request is allowed for the given key"""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            
            # Get existing requests and filter to window
            requests = self._requests.get(key, [])
            requests = [t for t in requests if t > window_start]
            
            if len(requests) >= self.max_requests:
                self._requests[key] = requests
                return False
            
            requests.append(now)
            self._requests[key] = requests
            return True
    
    async def get_remaining(self, key: str) -> int:
        """Get remaining requests for the key"""
        async with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            requests = self._requests.get(key, [])
            requests = [t for t in requests if t > window_start]
            return max(0, self.max_requests - len(requests))


# =============================================================================
# Retry Logic
# =============================================================================

def with_retry(
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    backoff_factor: float = 2.0,
    retry_exceptions: tuple = (Exception,),
    on_retry: Callable = None
):
    """
    Decorator for async functions with exponential backoff retry.
    
    Usage:
        @with_retry(max_attempts=3, retry_exceptions=(httpx.HTTPError,))
        async def make_api_call():
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            delay = initial_delay
            last_exception = None
            
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except retry_exceptions as e:
                    last_exception = e
                    
                    if attempt < max_attempts - 1:
                        if on_retry:
                            on_retry(attempt + 1, e)
                        
                        logger.warning(
                            f"Attempt {attempt + 1}/{max_attempts} failed: {e}. "
                            f"Retrying in {delay:.1f}s..."
                        )
                        
                        await asyncio.sleep(delay)
                        delay = min(delay * backoff_factor, max_delay)
            
            raise last_exception
        
        return wrapper
    return decorator


async def retry_with_backoff(
    func: Callable,
    *args,
    max_attempts: int = 3,
    initial_delay: float = 1.0,
    **kwargs
) -> T:
    """
    Execute a function with retry logic.
    
    Usage:
        result = await retry_with_backoff(
            make_api_call,
            endpoint="/users",
            max_attempts=5
        )
    """
    delay = initial_delay
    
    for attempt in range(max_attempts):
        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        except Exception as e:
            if attempt < max_attempts - 1:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                await asyncio.sleep(delay)
                delay *= 2
            else:
                raise


# =============================================================================
# Webhook Utilities
# =============================================================================

def verify_webhook_signature(
    payload: bytes,
    signature: str,
    secret: str,
    algorithm: str = "sha256"
) -> bool:
    """
    Verify webhook signature (HMAC).
    
    Usage:
        is_valid = verify_webhook_signature(
            payload=request.body,
            signature=request.headers["X-Signature"],
            secret="webhook_secret"
        )
    """
    if algorithm == "sha256":
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
    elif algorithm == "sha1":
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha1
        ).hexdigest()
    else:
        raise ValueError(f"Unsupported algorithm: {algorithm}")
    
    # Handle various signature formats
    if signature.startswith("sha256="):
        signature = signature[7:]
    elif signature.startswith("sha1="):
        signature = signature[5:]
    
    return hmac.compare_digest(expected, signature)


def generate_webhook_secret(length: int = 32) -> str:
    """Generate a secure webhook secret"""
    import secrets
    return secrets.token_hex(length)


# =============================================================================
# Data Transformation
# =============================================================================

def flatten_dict(
    d: Dict[str, Any],
    parent_key: str = '',
    separator: str = '.'
) -> Dict[str, Any]:
    """
    Flatten a nested dictionary.
    
    Example:
        {"a": {"b": 1}} -> {"a.b": 1}
    """
    items = []
    for key, value in d.items():
        new_key = f"{parent_key}{separator}{key}" if parent_key else key
        if isinstance(value, dict):
            items.extend(flatten_dict(value, new_key, separator).items())
        else:
            items.append((new_key, value))
    return dict(items)


def unflatten_dict(
    d: Dict[str, Any],
    separator: str = '.'
) -> Dict[str, Any]:
    """
    Unflatten a dictionary.
    
    Example:
        {"a.b": 1} -> {"a": {"b": 1}}
    """
    result = {}
    for key, value in d.items():
        parts = key.split(separator)
        current = result
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = value
    return result


def deep_merge(base: Dict, override: Dict) -> Dict:
    """
    Deep merge two dictionaries.
    Override values take precedence.
    """
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result


def extract_json_path(data: Dict[str, Any], path: str) -> Any:
    """
    Extract value from nested dict using dot notation.
    
    Example:
        extract_json_path({"a": {"b": [1, 2]}}, "a.b.0") -> 1
    """
    parts = path.split('.')
    current = data
    
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        elif isinstance(current, list):
            try:
                current = current[int(part)]
            except (ValueError, IndexError):
                return None
        else:
            return None
        
        if current is None:
            return None
    
    return current


# =============================================================================
# Async Helpers
# =============================================================================

async def gather_with_concurrency(
    tasks: List,
    max_concurrent: int = 10
) -> List:
    """
    Execute tasks with limited concurrency.
    
    Usage:
        results = await gather_with_concurrency(
            [fetch(url) for url in urls],
            max_concurrent=5
        )
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def limited_task(task):
        async with semaphore:
            return await task
    
    return await asyncio.gather(*[limited_task(t) for t in tasks])


class AsyncBatcher:
    """
    Batch multiple calls into single execution.
    
    Usage:
        batcher = AsyncBatcher(
            batch_func=process_batch,
            max_batch_size=100,
            max_wait_ms=50
        )
        
        result = await batcher.add(item)
    """
    
    def __init__(
        self,
        batch_func: Callable,
        max_batch_size: int = 100,
        max_wait_ms: float = 50
    ):
        self.batch_func = batch_func
        self.max_batch_size = max_batch_size
        self.max_wait_ms = max_wait_ms
        self._items: List = []
        self._futures: List[asyncio.Future] = []
        self._lock = asyncio.Lock()
        self._timer_task: Optional[asyncio.Task] = None
    
    async def add(self, item: Any) -> Any:
        """Add item to batch and wait for result"""
        future = asyncio.get_event_loop().create_future()
        
        async with self._lock:
            self._items.append(item)
            self._futures.append(future)
            
            if len(self._items) >= self.max_batch_size:
                await self._flush()
            elif self._timer_task is None:
                self._timer_task = asyncio.create_task(self._timer())
        
        return await future
    
    async def _timer(self):
        """Timer to flush after max_wait_ms"""
        await asyncio.sleep(self.max_wait_ms / 1000)
        async with self._lock:
            if self._items:
                await self._flush()
            self._timer_task = None
    
    async def _flush(self):
        """Execute batch and resolve futures"""
        items = self._items
        futures = self._futures
        self._items = []
        self._futures = []
        
        try:
            results = await self.batch_func(items)
            for future, result in zip(futures, results):
                future.set_result(result)
        except Exception as e:
            for future in futures:
                future.set_exception(e)


# =============================================================================
# Pagination Helpers
# =============================================================================

async def paginate_all(
    fetch_func: Callable,
    page_size: int = 100,
    max_pages: int = None,
    cursor_field: str = "cursor",
    data_field: str = "data"
) -> List[Dict[str, Any]]:
    """
    Fetch all pages from a paginated API.
    
    Usage:
        all_users = await paginate_all(
            lambda cursor: api.list_users(cursor=cursor, limit=100),
            max_pages=10
        )
    """
    all_data = []
    cursor = None
    page = 0
    
    while True:
        result = await fetch_func(cursor)
        
        data = result.get(data_field, [])
        all_data.extend(data)
        
        cursor = result.get(cursor_field)
        page += 1
        
        if not cursor or not data:
            break
        
        if max_pages and page >= max_pages:
            break
    
    return all_data


# =============================================================================
# Caching
# =============================================================================

class AsyncCache:
    """
    Simple async-safe in-memory cache with TTL.
    
    Usage:
        cache = AsyncCache(default_ttl=300)
        
        await cache.set("key", value)
        value = await cache.get("key")
    """
    
    def __init__(self, default_ttl: int = 300):
        self.default_ttl = default_ttl
        self._cache: Dict[str, tuple] = {}  # key -> (value, expires_at)
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value if exists and not expired"""
        async with self._lock:
            if key in self._cache:
                value, expires_at = self._cache[key]
                if datetime.utcnow() < expires_at:
                    return value
                del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None):
        """Set value with TTL"""
        ttl = ttl or self.default_ttl
        expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        async with self._lock:
            self._cache[key] = (value, expires_at)
    
    async def delete(self, key: str):
        """Delete a key"""
        async with self._lock:
            self._cache.pop(key, None)
    
    async def clear(self):
        """Clear all cache"""
        async with self._lock:
            self._cache.clear()
    
    async def cleanup_expired(self):
        """Remove expired entries"""
        async with self._lock:
            now = datetime.utcnow()
            expired = [k for k, (_, exp) in self._cache.items() if now >= exp]
            for key in expired:
                del self._cache[key]


def cached(ttl: int = 300, key_func: Callable = None):
    """
    Decorator for caching async function results.
    
    Usage:
        @cached(ttl=60)
        async def fetch_user(user_id: str):
            ...
    """
    cache = AsyncCache(default_ttl=ttl)
    
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}:{args}:{kwargs}"
            
            result = await cache.get(cache_key)
            if result is not None:
                return result
            
            result = await func(*args, **kwargs)
            await cache.set(cache_key, result)
            return result
        
        wrapper.cache = cache
        return wrapper
    
    return decorator
