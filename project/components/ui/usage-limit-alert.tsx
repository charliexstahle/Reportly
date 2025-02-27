import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UsageInfo } from "@/lib/types";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import Link from "next/link";

interface UsageLimitAlertProps {
  usage: UsageInfo;
  resourceType: 'reports' | 'storage';
  showWarningAt?: number; // Percentage at which to show warning (default: 80%)
}

export function UsageLimitAlert({ usage, resourceType, showWarningAt = 80 }: UsageLimitAlertProps) {
  // If the user has unlimited usage or is well below their limit, don't show anything
  if (usage.isUnlimited || !usage.percentUsed || usage.percentUsed < showWarningAt) {
    return null;
  }

  const isAtLimit = usage.percentUsed >= 100;
  const resourceName = resourceType === 'reports' ? 'Report' : 'Storage';
  const description = resourceType === 'reports' 
    ? `You've used ${usage.currentUsage} out of ${usage.limit} monthly reports.` 
    : `You're using ${usage.currentUsage}MB out of ${usage.limit}MB storage.`;

  return (
    <Alert variant={isAtLimit ? "destructive" : "warning"} className="mb-4">
      <ExclamationTriangleIcon className="h-4 w-4" />
      <AlertTitle>{isAtLimit ? `${resourceName} limit reached` : `${resourceName} limit warning`}</AlertTitle>
      <AlertDescription className="flex flex-col gap-2">
        <p>{description}</p>
        <Progress value={Math.min(usage.percentUsed, 100)} className="h-2" />
        {isAtLimit && (
          <div className="flex justify-end mt-2">
            <Button size="sm" asChild>
              <Link href="/pricing">Upgrade Plan</Link>
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}