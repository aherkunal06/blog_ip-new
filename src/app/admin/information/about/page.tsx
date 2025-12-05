// src/admin/pages/AboutAdmin.tsx
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import InfoAdmin from "@/admin-components/InfoAdmin";

export default function AboutAdminPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Check route permission on mount
  useEffect(() => {
    const checkPermission = async () => {
      if (session?.user?.role === 'super-admin') {
        return; // Super admins have all permissions
      }

      try {
        const res = await fetch(`/api/admin/check-route?route=/admin/information/about&method=GET`);
        const data = await res.json();
        
        if (!data.hasPermission) {
          toast.error("You don't have permission to access this page");
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error checking permission:', error);
      }
    };

    if (session) {
      checkPermission();
    }
  }, [session, router]);

  return <InfoAdmin type="ABOUT" title="About Management" />;
}
