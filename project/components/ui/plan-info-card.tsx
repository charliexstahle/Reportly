import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BadgeCheck, Award, Zap } from 'lucide-react';

interface PlanCardProps {
  planTier: string;
  isSubscriptionActive: boolean;
  reportUsage: {
    currentUsage: number;
    limit: number | null;
    isUnlimited: boolean;
    percentUsed: number | null;
  };
  storageUsage: {
    currentUsage: number;
    limit: number | null;
    isUnlimited: boolean;
    percentUsed: number | null;
  };
  subscriptionStartsAt?: string;
  subscriptionEndsAt?: string;
}

export function PlanInfoCard({
  planTier,
  isSubscriptionActive,
  reportUsage,
  storageUsage,
  subscriptionStartsAt,
  subscriptionEndsAt,
}: PlanCardProps) {
  // Function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Function to get plan icon and color
  const getPlanDetails = () => {
    switch (planTier) {
      case 'professional':
        return {
          icon: <Award className="h-5 w-5 text-primary" />,
          badgeColor: 'bg-primary/10 text-primary',
          name: 'Professional'
        };
      case 'enterprise':
        return {
          icon: <Zap className="h-5 w-5 text-amber-500" />,
          badgeColor: 'bg-amber-500/10 text-amber-500',
          name: 'Enterprise'
        };
      default:
        return {
          icon: <BadgeCheck className="h-5 w-5 text-slate-500" />,
          badgeColor: 'bg-slate-500/10 text-slate-500',
          name: 'Free'
        };
    }
  };

  const planDetails = getPlanDetails();

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Plan</CardTitle>
            <CardDescription>Current subscription information</CardDescription>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${planDetails.badgeColor}`}>
            {planDetails.icon}
            <span className="font-medium">{planDetails.name}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isSubscriptionActive && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
            Your subscription is inactive. Some features may be limited.
          </div>
        )}

        {/* Report Usage */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Report Usage</span>
            <span className="text-sm text-muted-foreground">
              {reportUsage.isUnlimited ? 
                'Unlimited' : 
                `${reportUsage.currentUsage} / ${reportUsage.limit} reports`}
            </span>
          </div>
          {!reportUsage.isUnlimited && (
            <Progress 
              value={reportUsage.percentUsed || 0} 
              className="h-2"
              indicatorClassName={reportUsage.percentUsed && reportUsage.percentUsed > 80 ? "bg-amber-500" : ""}
            />
          )}
        </div>
        
        {/* Storage Usage */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Storage Usage</span>
            <span className="text-sm text-muted-foreground">
              {storageUsage.isUnlimited ? 
                'Unlimited' : 
                `${storageUsage.currentUsage} MB / ${storageUsage.limit} MB`}
            </span>
          </div>
          {!storageUsage.isUnlimited && (
            <Progress 
              value={storageUsage.percentUsed || 0} 
              className="h-2"
              indicatorClassName={storageUsage.percentUsed && storageUsage.percentUsed > 80 ? "bg-amber-500" : ""}
            />
          )}
        </div>

        {/* Subscription dates */}
        {subscriptionStartsAt && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Started</p>
              <p className="font-medium">{formatDate(subscriptionStartsAt)}</p>
            </div>
            {subscriptionEndsAt && (
              <div>
                <p className="text-sm text-muted-foreground">Renews/Expires</p>
                <p className="font-medium">{formatDate(subscriptionEndsAt)}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" asChild>
          <Link href="/reports">View Usage Details</Link>
        </Button>
        <Button asChild>
          <Link href="/pricing">
            {planTier === 'free' ? 'Upgrade Plan' : 'Manage Subscription'}
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}