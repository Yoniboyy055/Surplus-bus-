"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";

interface SaveOpportunityButtonProps {
  opportunityId: string;
  isSaved: boolean;
  userId: string;
}

export function SaveOpportunityButton({ opportunityId, isSaved, userId }: SaveOpportunityButtonProps) {
  const [saved, setSaved] = useState(isSaved);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/saved?opportunity_id=${opportunityId}`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ opportunity_id: opportunityId }),
        });
        setSaved(true);
      }
    } catch (e) {
      console.error("Save failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border ${
        saved
          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
          : "bg-quantum-800 text-quantum-400 border-quantum-700 hover:text-quantum-50 hover:border-quantum-600"
      }`}
    >
      {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
      {saved ? "Saved" : "Save"}
    </button>
  );
}
