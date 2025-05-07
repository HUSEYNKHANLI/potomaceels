import { useState } from "react";
import Navbar from "@/components/Navbar";
import TabSwitcher from "@/components/TabSwitcher";
import OrderView from "@/components/OrderView";
import ManagementDashboard from "@/components/ManagementDashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"order" | "management">("order");

  const handleTabChange = (tab: "order" | "management") => {
    setActiveTab(tab);
  };

  return (
    <div className="relative flex flex-col">
      <Navbar />
      <TabSwitcher onTabChange={handleTabChange} activeTab={activeTab} />
      
      {activeTab === "order" ? (
        <OrderView />
      ) : (
        <ManagementDashboard />
      )}
    </div>
  );
}
