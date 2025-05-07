import { useState } from "react";

interface TabSwitcherProps {
  onTabChange: (tab: "order" | "management") => void;
  activeTab: "order" | "management";
}

export default function TabSwitcher({ onTabChange, activeTab }: TabSwitcherProps) {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="flex border-b border-neutral">
        <button 
          onClick={() => onTabChange("order")}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === "order" 
              ? "border-secondary text-secondary" 
              : "border-transparent text-neutral hover:text-neutral-dark"
          }`}
        >
          Place Order
        </button>
        <button 
          onClick={() => onTabChange("management")}
          className={`px-4 py-2 font-medium border-b-2 ${
            activeTab === "management" 
              ? "border-secondary text-secondary" 
              : "border-transparent text-neutral hover:text-neutral-dark"
          }`}
        >
          Management Dashboard
        </button>
      </div>
    </div>
  );
}
