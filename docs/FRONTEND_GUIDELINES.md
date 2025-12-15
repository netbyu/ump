# Frontend Stack Guidelines

**React + Tailwind CSS + shadcn/ui + Locofy**

*Version 1.0 • December 2024*

---

## Executive Summary

This document outlines our standardized frontend development stack for building production-grade user interfaces. The stack was selected to optimize the Figma-to-code workflow while maintaining high code quality and developer productivity.

**Key Benefits:**

- Seamless Figma design integration via Locofy
- Production-ready, accessible components out of the box
- Industry-standard tooling with extensive ecosystem support
- Consistent design language across all applications

---

## Stack Components

### React

React is a JavaScript library for building user interfaces, developed and maintained by Meta. It uses a component-based architecture where UIs are built from reusable, self-contained pieces.

**Core Concepts:**

- **Declarative:** Describe what the UI should look like for a given state; React handles DOM updates
- **JSX Syntax:** Write HTML-like code directly in JavaScript files
- **Virtual DOM:** Efficient rendering through intelligent diffing before updating the browser DOM
- **Component Reusability:** Build once, use everywhere with props for customization
- **Massive Ecosystem:** Libraries for routing, state management, forms, testing, and more

**Example:**

```jsx
function UserCard({ name, role }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold">{name}</h2>
      <p className="text-gray-600">{role}</p>
    </div>
  );
}
```

---

### Tailwind CSS

Tailwind is a utility-first CSS framework. Instead of writing custom CSS classes, you compose styles directly in your markup using predefined utility classes.

**Why Tailwind:**

- **No Context Switching:** Style directly where you build components
- **Design Tokens Built-in:** Consistent spacing scale, colors, and typography
- **Figma Alignment:** Auto-layout padding/gap maps directly to Tailwind's spacing utilities
- **Optimized Builds:** Purges unused CSS; production builds include only used classes
- **Responsive/Dark Mode:** Built-in prefixes like `md:flex` or `dark:bg-gray-800`

**Example:**

```html
<!-- Traditional CSS approach -->
<div class="card">...</div>  <!-- then define .card in a stylesheet -->

<!-- Tailwind approach -->
<div class="bg-white rounded-lg shadow-md p-6 flex gap-4">...</div>
```

**Spacing Scale Reference:**

| Class | Value |
|-------|-------|
| `p-1` | 0.25rem (4px) |
| `p-2` | 0.5rem (8px) |
| `p-4` | 1rem (16px) |
| `p-6` | 1.5rem (24px) |
| `p-8` | 2rem (32px) |

---

### shadcn/ui

Unlike traditional component libraries, shadcn/ui is a collection of beautifully designed, accessible components that you copy into your project and own completely. Built on Radix UI primitives with Tailwind styling.

**Key Differentiators:**

- **No NPM Dependency:** Components are copied into your codebase, not installed as packages
- **Full Ownership:** Modify anything without fighting library abstractions
- **Accessibility Baked In:** Radix handles keyboard navigation, ARIA attributes, focus management
- **Themeable:** Uses CSS variables, easy to match your Figma design tokens
- **Available Components:** Button, Dialog, Dropdown, Tabs, Toast, Data Table, Form inputs, and more

**Installation:**

```bash
# Initialize shadcn/ui in your project
npx shadcn-ui@latest init

# Add individual components as needed
npx shadcn-ui add button
npx shadcn-ui add card
npx shadcn-ui add dialog
npx shadcn-ui add input
```

---

## Locofy: Figma to Code

Locofy is a dedicated Figma-to-code platform that converts designs into production-ready React code. It uses a combination of rule-based conversion and AI to generate clean, maintainable output.

### Why Locofy

After evaluating multiple Figma-to-code tools (Builder.io, Anima, Plasmic), Locofy was selected for the following reasons:

| Criteria | Locofy | Builder.io |
|----------|--------|------------|
| Control Level | High (manual tagging) | Low (AI-driven) |
| Code Quality | Production-ready | Needs cleanup |
| Responsive Handling | Explicit definition | AI-inferred |
| Component Mapping | Tag to your library | Map to components |
| Learning Curve | Moderate | Low |
| Best For | Production apps | Prototypes/landing pages |

### Locofy Workflow

1. **Install Locofy Plugin:** Search for "Locofy" in Figma's Community plugins and install

2. **Prepare Figma File:** Ensure proper auto-layout, naming conventions, and component structure

3. **Tag Elements:** Define interactive elements, responsiveness breakpoints, and component mappings

4. **Configure Settings:** Select React as framework, Tailwind for styling, and configure project structure

5. **Generate Code:** Export to your local project or download as ZIP

6. **Refine & Integrate:** Review generated code, connect to APIs, add business logic

---

## Figma Best Practices for Locofy

The quality of Locofy's output depends heavily on how well Figma files are prepared. Follow these guidelines to maximize code quality.

### Auto-Layout Requirements

- **Always use Auto-Layout:** Never use absolute positioning; Locofy converts auto-layout to Flexbox
- **Set Explicit Gaps:** Define spacing between elements; maps directly to Tailwind's gap utilities
- **Define Padding:** Set padding on containers; converts to `p-*` classes
- **Use Proper Alignment:** Explicit alignment settings convert to `justify-*` and `items-*` classes

### Naming Conventions

- **Semantic Names:** Use descriptive names like "HeaderNav", "UserCard", "PrimaryButton"
- **Avoid Generic Names:** Don't use "Frame 1", "Group 2"; these create unclear code
- **PascalCase for Components:** Names become React component names; follow React conventions
- **Prefix by Type:** Consider prefixes like "Icon/", "Button/", "Input/" for organization

### Component Structure

- **Create Figma Components:** Reusable elements should be Figma components; Locofy detects and creates React components
- **Use Variants:** Figma variants can convert to React props (e.g., size, color, state)
- **Flatten When Possible:** Avoid deeply nested groups; flatter structures produce cleaner code
- **Separate Concerns:** Keep layout containers separate from content components

### Design Tokens

- **Use Figma Variables:** Define colors, spacing, and typography as variables; export to Tailwind config
- **Standardize Spacing:** Use 4px/8px grid system; aligns with Tailwind's default scale
- **Limit Color Palette:** Define a finite set of colors; makes theming easier

---

## Development Workflow

### Project Setup

```bash
# 1. Create React Project with Next.js
npx create-next-app@latest my-app --typescript --tailwind --eslint

# 2. Navigate to project
cd my-app

# 3. Initialize shadcn/ui
npx shadcn-ui@latest init

# 4. Add required components
npx shadcn-ui add button card dialog input dropdown-menu tabs toast

# 5. Configure Tailwind (import design tokens from Figma into tailwind.config.js)
```

### Daily Development Cycle

1. **Design Review:** Designer updates Figma; developer reviews changes

2. **Tag & Configure:** Tag new/modified elements in Locofy plugin

3. **Generate Code:** Export from Locofy to project directory

4. **Review & Refine:** Clean up generated code, ensure consistency with existing codebase

5. **Add Logic:** Connect to APIs, add state management, implement business logic

6. **Test:** Verify functionality, responsiveness, and accessibility

7. **Commit:** Push changes following Git conventions

---

## Code Standards

### File Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Header, Footer, Sidebar
│   └── features/     # Feature-specific components
├── pages/            # Next.js pages (or routes/)
├── styles/           # Global styles, Tailwind config
├── lib/              # Utility functions
├── hooks/            # Custom React hooks
└── types/            # TypeScript type definitions
```

### Component Guidelines

- One component per file; file name matches component name
- Use TypeScript interfaces for props
- Prefer functional components with hooks over class components
- Keep components under 200 lines; extract sub-components as needed
- Co-locate tests with components (`ComponentName.test.tsx`)

**Example Component:**

```tsx
// components/features/UserCard.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface UserCardProps {
  name: string;
  role: string;
  avatarUrl?: string;
}

export function UserCard({ name, role, avatarUrl }: UserCardProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <h2 className="text-xl font-semibold">{name}</h2>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{role}</p>
      </CardContent>
    </Card>
  );
}
```

### Tailwind Best Practices

- Use design tokens from `tailwind.config.js` rather than arbitrary values
- Extract repeated utility patterns into `@apply` directives or components
- Mobile-first: start with base styles, add responsive modifiers (`md:`, `lg:`)
- Use `clsx` or `tailwind-merge` for conditional class composition
- Avoid inline styles; always prefer Tailwind utilities

**Conditional Classes Example:**

```tsx
import { clsx } from "clsx";

function Button({ variant, children }) {
  return (
    <button
      className={clsx(
        "px-4 py-2 rounded-lg font-medium transition-colors",
        variant === "primary" && "bg-blue-600 text-white hover:bg-blue-700",
        variant === "secondary" && "bg-gray-200 text-gray-800 hover:bg-gray-300"
      )}
    >
      {children}
    </button>
  );
}
```

---

## Quality Expectations

Locofy generates approximately 70-80% of the final code. The remaining 20-30% requires manual refinement:

| Locofy Handles Well | Requires Manual Work |
|---------------------|----------------------|
| Static layouts and structure | Complex animations |
| Basic responsive breakpoints | Business logic & API integration |
| Component hierarchy | State management |
| Tailwind class generation | Form validation |
| Basic interactivity (hover, etc.) | Authentication flows |
| Image and asset handling | Error handling & edge cases |

---

## Resources & Links

### Documentation

- **React:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs
- **shadcn/ui:** https://ui.shadcn.com
- **Locofy:** https://www.locofy.ai/docs
- **Next.js:** https://nextjs.org/docs

### Learning Resources

- React Tutorial: [react.dev/learn](https://react.dev/learn)
- Tailwind CSS Course: [tailwindcss.com/docs/utility-first](https://tailwindcss.com/docs/utility-first)
- Locofy Tutorial Videos: [youtube.com/@locofy](https://youtube.com/@locofy)
- TypeScript Handbook: [typescriptlang.org/docs/handbook](https://typescriptlang.org/docs/handbook)

### Useful Tools

- **clsx:** Utility for constructing className strings conditionally
- **tailwind-merge:** Merge Tailwind classes without conflicts
- **Prettier + Tailwind Plugin:** Auto-sort Tailwind classes
- **ESLint:** Code quality and consistency

---

## Quick Reference

### Common Tailwind Classes

```
Layout:       flex, grid, block, hidden
Flexbox:      justify-center, items-center, gap-4, flex-col
Spacing:      p-4, px-6, py-2, m-4, mx-auto, mt-8
Sizing:       w-full, h-screen, max-w-lg, min-h-[200px]
Typography:   text-xl, font-bold, text-gray-600, leading-relaxed
Colors:       bg-white, text-blue-600, border-gray-200
Borders:      rounded-lg, border, border-2
Shadows:      shadow-sm, shadow-md, shadow-lg
Responsive:   sm:flex, md:grid-cols-2, lg:text-xl
States:       hover:bg-blue-700, focus:ring-2, disabled:opacity-50
Dark Mode:    dark:bg-gray-800, dark:text-white
```

### shadcn/ui Component Quick Add

```bash
npx shadcn-ui add accordion
npx shadcn-ui add alert
npx shadcn-ui add avatar
npx shadcn-ui add badge
npx shadcn-ui add button
npx shadcn-ui add card
npx shadcn-ui add checkbox
npx shadcn-ui add dialog
npx shadcn-ui add dropdown-menu
npx shadcn-ui add form
npx shadcn-ui add input
npx shadcn-ui add label
npx shadcn-ui add select
npx shadcn-ui add table
npx shadcn-ui add tabs
npx shadcn-ui add toast
```

---

## Team Contacts

For questions about this stack or workflow, contact the EngineIQ Integration Team lead.

---

*— End of Document —*