import { Box } from "lucide-react";
import React from "react";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center py-4">
      <div className="flex items-center gap-2">
        <Box className="size-8" />
        <span className="tracking-tighter text-3xl font-extrabold text-primary">
        Saifu
        </span>
      </div>
    </nav>
  );
};

export default Navbar;