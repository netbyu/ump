"""Unit tests for RBAC logic."""
import pytest
import casbin
from pathlib import Path


@pytest.fixture
def enforcer():
    """Create test enforcer with in-memory policies."""
    model_path = Path(__file__).parent.parent / "app" / "auth" / "model.conf"
    e = casbin.Enforcer(str(model_path))

    # Add test policies
    # Admin can do everything
    e.add_policy("admin", "*", "*", "*")

    # Operator permissions
    e.add_policy("operator", "tenant_acme", "extensions", "read")
    e.add_policy("operator", "tenant_acme", "extensions", "update")

    # Viewer permissions
    e.add_policy("viewer", "tenant_acme", "extensions", "read")

    # Role assignments
    e.add_grouping_policy("alice", "admin", "*")
    e.add_grouping_policy("bob", "operator", "tenant_acme")
    e.add_grouping_policy("charlie", "viewer", "tenant_acme")

    return e


class TestPlatformAdmin:
    """Tests for platform administrator permissions."""

    def test_admin_can_access_any_tenant(self, enforcer):
        assert enforcer.enforce("alice", "tenant_acme", "extensions", "delete")
        assert enforcer.enforce("alice", "tenant_globex", "users", "create")

    def test_admin_can_do_any_action(self, enforcer):
        for action in ["create", "read", "update", "delete", "admin"]:
            assert enforcer.enforce("alice", "*", "extensions", action)


class TestOperator:
    """Tests for operator role permissions."""

    def test_operator_can_read_extensions(self, enforcer):
        assert enforcer.enforce("bob", "tenant_acme", "extensions", "read")

    def test_operator_can_update_extensions(self, enforcer):
        assert enforcer.enforce("bob", "tenant_acme", "extensions", "update")

    def test_operator_cannot_delete_extensions(self, enforcer):
        assert not enforcer.enforce("bob", "tenant_acme", "extensions", "delete")

    def test_operator_cannot_access_other_tenant(self, enforcer):
        assert not enforcer.enforce("bob", "tenant_globex", "extensions", "read")


class TestViewer:
    """Tests for viewer role permissions."""

    def test_viewer_can_read_extensions(self, enforcer):
        assert enforcer.enforce("charlie", "tenant_acme", "extensions", "read")

    def test_viewer_cannot_modify_extensions(self, enforcer):
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "update")
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "create")
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "delete")


class TestUnknownUser:
    """Tests for unauthenticated/unknown users."""

    def test_unknown_user_denied(self, enforcer):
        assert not enforcer.enforce("unknown", "tenant_acme", "extensions", "read")


class TestDynamicPolicyChanges:
    """Tests for runtime policy modifications."""

    def test_add_role_grants_permission(self, enforcer):
        # Initially denied
        assert not enforcer.enforce("newuser", "tenant_acme", "extensions", "read")

        # Assign role
        enforcer.add_grouping_policy("newuser", "viewer", "tenant_acme")

        # Now allowed
        assert enforcer.enforce("newuser", "tenant_acme", "extensions", "read")

    def test_remove_role_revokes_permission(self, enforcer):
        # Initially allowed
        assert enforcer.enforce("charlie", "tenant_acme", "extensions", "read")

        # Remove role
        enforcer.remove_grouping_policy("charlie", "viewer", "tenant_acme")

        # Now denied
        assert not enforcer.enforce("charlie", "tenant_acme", "extensions", "read")


class TestWildcardMatching:
    """Tests for wildcard domain and action matching."""

    def test_wildcard_domain_matches_any_tenant(self, enforcer):
        # Admin has wildcard domain
        assert enforcer.enforce("alice", "tenant_foo", "settings", "admin")
        assert enforcer.enforce("alice", "tenant_bar", "settings", "admin")

    def test_wildcard_action_matches_any_action(self, enforcer):
        # Admin has wildcard action
        assert enforcer.enforce("alice", "*", "users", "create")
        assert enforcer.enforce("alice", "*", "users", "custom_action")
