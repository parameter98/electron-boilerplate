import Footer from "@/components/footer";
import Navbar from "@/components/navbar";
import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  component: () => (
    <>
      <Navbar />
      <div className="pt-12 h-screen">
        <Outlet />
      </div>
      <Footer />
    </>
  ),
});
