"use client"
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function DisqualifiedPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-red-600 mb-4">You have been disqualified</h1>
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          You have been removed from the quiz due to repeated proctoring violations or not resuming in time.<br />
          If you believe this is a mistake, please contact your quiz administrator.
        </p>
        <Button onClick={() => router.replace("/")}>Return to Home</Button>
      </div>
    </div>
  );
} 