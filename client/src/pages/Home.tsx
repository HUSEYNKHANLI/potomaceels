import { useState } from "react";
import Navbar from "@/components/Navbar";
import TabSwitcher from "@/components/TabSwitcher";
import OrderView from "@/components/OrderView";
import ManagementDashboard from "@/components/ManagementDashboard";
import Footer from "@/components/Footer";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"order" | "management">("order");

  const handleTabChange = (tab: "order" | "management") => {
    setActiveTab(tab);
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar />
      <TabSwitcher onTabChange={handleTabChange} activeTab={activeTab} />
      
      {activeTab === "order" ? (
        <OrderView />
      ) : (
        <ManagementDashboard />
      )}
      
      <Footer />
    </div>
  );
}
