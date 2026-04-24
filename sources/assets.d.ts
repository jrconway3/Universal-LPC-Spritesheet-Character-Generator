// Ambient declarations for non-code module imports handled by Vite.
// Side-effect imports (`import "./foo.scss"`) need a matching module
// declaration so TypeScript doesn't complain. These have no runtime
// types; Vite processes the assets at build time.

declare module "*.scss";
declare module "*.css";
