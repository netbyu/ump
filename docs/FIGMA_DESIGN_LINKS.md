# Figma Design References

*UC Platform - Unified Communication Management*

---

## Main Design File

- **Figma Link:** [Application Shell and Navigation](https://www.figma.com/design/7fXYzkkkk4SCuHXj6lZPtI/Application-Shell-and-Navigation)
- **Status:** Partly Completed
- **Last Updated:** December 2024
- **Design System:** Based on shadcn/ui components with Tailwind CSS

## Exported Code

- **Location:** `References/figma/`
- **Framework:** Vite + React
- **Export Type:** Application Shell and Navigation components
- **Status:** Reference implementation (Vite-based)

### Using the Figma Export

The `References/figma/` directory contains a Vite project exported from Figma. This is a **reference implementation** to guide integration into the main Next.js project.

**To preview the Figma export:**
```bash
cd References/figma
npm install
npm run dev
```

**Integration approach:**
1. Review components in `References/figma/src/components/`
2. Identify reusable patterns and layouts
3. Adapt components to Next.js structure in main `src/` directory
4. Replace Vite-specific code with Next.js equivalents
5. Ensure styling aligns with `tailwind.config.ts`
6. Use existing shadcn/ui components where possible

**Note:** Do NOT copy code directly. Use as visual/structural reference and rebuild using Next.js conventions.

---

## Design Sections Status

### ✅ Completed
- [ ] Root Layout (HTML structure)
- [ ] Global Styles & Theme Variables
- [ ] Component Library Setup

### 🚧 In Progress
- [ ] Authentication Flow
  - [ ] Login Page
  - [ ] Register Page
  - [ ] Password Reset
- [ ] Dashboard Layout
  - [ ] Header Component
  - [ ] Sidebar Navigation
  - [ ] Main Content Area
- [ ] Phone Systems Module
  - [ ] Systems List View
  - [ ] System Detail View
  - [ ] Add/Edit System Form
- [ ] Infrastructure Module
  - [ ] Device List
  - [ ] Device Monitoring
- [ ] Automation Module
  - [ ] Workflow List
  - [ ] Workflow Builder
- [ ] AI Chat Interface
  - [ ] Chat Room
  - [ ] Message History
- [ ] Settings Page
  - [ ] User Profile
  - [ ] System Configuration

### 📋 Planned
- [ ] Notifications System
- [ ] Advanced Filtering
- [ ] Data Export Features
- [ ] Mobile Responsive Views

---

## Locofy Export Configuration

### Preparation Checklist
- [ ] All frames use Auto-layout (no absolute positioning)
- [ ] Components use PascalCase naming (e.g., "UserCard", "HeaderNav")
- [ ] Spacing uses 4px/8px grid system
- [ ] Colors defined as Figma variables
- [ ] Typography styles standardized
- [ ] Interactive elements tagged for Locofy
- [ ] Responsive breakpoints defined

### Export Settings
- **Framework:** React (Next.js)
- **Styling:** Tailwind CSS
- **Component Library:** Map to shadcn/ui where applicable
- **Output Structure:** Matches `src/components/` organization

---

## Design Tokens Mapping

### Colors
Map Figma variables to Tailwind config:
- Primary → `hsl(var(--primary))`
- Secondary → `hsl(var(--secondary))`
- Success → `hsl(var(--success))`
- Warning → `hsl(var(--warning))`
- Destructive → `hsl(var(--destructive))`

### Spacing
Figma Auto-layout gaps/padding → Tailwind utilities:
- 4px → `p-1` / `gap-1`
- 8px → `p-2` / `gap-2`
- 16px → `p-4` / `gap-4`
- 24px → `p-6` / `gap-6`
- 32px → `p-8` / `gap-8`

### Typography
- Headings: Inter font family
- Body: Inter font family
- Code/Mono: System monospace

---

## Component Mapping

Map Figma components to existing codebase:

| Figma Component | Code Location | Status |
|----------------|---------------|--------|
| Button | `src/components/ui/button.tsx` | ✅ Exists |
| Card | `src/components/ui/card.tsx` | ✅ Exists |
| Input | `src/components/ui/input.tsx` | ✅ Exists |
| Badge | `src/components/ui/badge.tsx` | ✅ Exists |
| Avatar | `src/components/ui/avatar.tsx` | ✅ Exists |
| Tabs | `src/components/ui/tabs.tsx` | ✅ Exists |
| Tooltip | `src/components/ui/tooltip.tsx` | ✅ Exists |
| Separator | `src/components/ui/separator.tsx` | ✅ Exists |
| Header | `src/components/layout/header.tsx` | ✅ Exists |
| Sidebar | `src/components/layout/sidebar.tsx` | ✅ Exists |
| AppLayout | `src/components/layout/app-layout.tsx` | ✅ Exists |

---

## Development Workflow

1. **Designer Updates Figma** → Notify development team
2. **Developer Reviews Changes** → Check design specs in Figma
3. **Tag Elements in Locofy** → Configure responsiveness and interactions
4. **Generate Code** → Export to project directory
5. **Refine & Integrate** → Clean up, connect to APIs, add business logic
6. **Test** → Verify functionality and responsive behavior
7. **Commit** → Push changes with descriptive commit message

---

## Access & Permissions

- **Figma Access:** [Contact team lead for access]
- **Locofy Plugin:** Install from Figma Community
- **Design Handoff:** Use Figma's Dev Mode for specs

---

## Notes

- Ensure all new components follow the structure in `Frontend Stack Guidelines.md`
- Locofy exports should be reviewed and refined before committing
- Keep design tokens in sync between Figma and `tailwind.config.ts`
- Run `npm run lint` after integrating Locofy-generated code

---

*Last Updated: December 12, 2024*
