# Project Guidelines

## Project Rules

- Never do typecast, never use `as` keyword in TypeScript. Always use type guards or type assertions.
- Always use `const` for variables that are not reassigned. Use `let` only when you need to reassign a variable.
- Always use `interface` for defining object shapes.
- Use `tailwind` v4 for styling

## Designing the Page

- We always prefer to use minimal styling and focus on functionality, we keep UI simple and clean. We want to be `zoo.dev` and `blender` like styling.
- We should use `tailwind` v4 for styling, and we should follow the design principles of `zoo.dev` and `blender`.
- We should use `tailwind` utility classes for styling, and we should avoid using custom CSS as much as possible.
- We use `base-ui` to build the UI components as much as possible, and we should avoid using custom UI components unless necessary.

## Project Structure

We use `vite` and `bun` to manage our project.

We have some packages here:

- `packages/core`: The core package that contains the main logic and algorithms.
- `packages/protocol`: The general protocol package can be shared in editor, generator.

We have two main apps, if you checkout the `apps/website`, you will find two main apps:

- `editor`
- `generator`

Keep your eyes on our guidelines.
