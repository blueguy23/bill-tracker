'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MONTHS, USD, AVATAR_COLORS, STATUS_VARIANT, STATUS_LABEL, type CalDay } from './calendarHelpers';

interface DayDialogProps {
  open: boolean;
  onClose: () => void;
  day: number;
  month: number;
  year: number;
  bills: CalDay[];
  isToday: boolean;
}

export function DayDialog({ open, onClose, day, month, year, bills, isToday }: DayDialogProps) {
  const dateStr = `${MONTHS[month]} ${day}, ${year}`;
  const total = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-background border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            {isToday && <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/25 text-[9px]">Today</Badge>}
            {dateStr}
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            {bills.length === 0
              ? 'No bills due — clear day'
              : `${bills.length} bill${bills.length !== 1 ? 's' : ''} · ${USD.format(total)} total`}
          </DialogDescription>
        </DialogHeader>

        {bills.length > 0 && (
          <div className="mt-2 space-y-0">
            {bills.map((bill, i) => (
              <div key={bill.id} className={`flex items-center gap-3 py-3 ${i > 0 ? 'border-t border-border' : ''}`}>
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className={`text-xs font-bold ${AVATAR_COLORS[bill.status]}`}>
                    {bill.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground truncate">{bill.name}</span>
                    <Badge variant="outline" className={`text-[9px] font-mono shrink-0 ${STATUS_VARIANT[bill.status]}`}>
                      {STATUS_LABEL[bill.status]}
                    </Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {bill.category} · {bill.isAutoPay ? 'Autopay' : 'Manual'}
                  </div>
                </div>
                <div className="font-mono text-[13px] font-semibold text-foreground shrink-0">
                  {USD.format(bill.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        {bills.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted-foreground font-mono">Total due</span>
            <span className="text-sm font-semibold font-mono text-foreground">{USD.format(total)}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
