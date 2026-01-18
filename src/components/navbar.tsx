import { Link } from "@tanstack/react-router";
import { ModeToggle } from "./mode-toggle";

export default function Navbar() {
  return (
    <div className="fixed w-full flex justify-between items-center hover:border-b px-4 hover:py-2 bg-background/80 backdrop-blur">
      <div className="flex gap-4 text-sm">
        <Link to="/" className="[&.active]:font-bold">
          About
        </Link>{" "}
        <Link to="/pdf_manager" className="[&.active]:font-bold">
          PDF Manager
        </Link>{" "}
        <Link to="/gamedev-log" className="[&.active]:font-bold">
          GameDev Log
        </Link>{" "}
        <Link to="/techspec-writer" className="[&.active]:font-bold">
          TechSpec Writer
        </Link>{" "}
        <Link to="/scrum-board" className="[&.active]:font-bold">
          Scrum Board
        </Link>{" "}
        <Link to="/tech-spec" className="[&.active]:font-bold">
          TechStack
        </Link>{" "}

      </div>
      <ModeToggle />
    </div>
  );
}
