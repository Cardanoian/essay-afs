"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserInfo } from "../lib/api"; // 위에서 만든 API 함수

interface User {
  id: number;
  email: string;
  name: string;
  school_level: string;
  feedback_guide?: Record<string, { studentExample: string; teacherFeedback: string }>;
  classes?: any[];
}

const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {

    getUserInfo()
      .then((res) => {
        setUser(res.data);
        setUserLoading(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        router.push("/login");
      });
  }, []);


  return { user, setUser, userLoading };
};

export default useAuth;