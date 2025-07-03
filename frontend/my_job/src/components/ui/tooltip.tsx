import * as React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

export const Tooltip = RadixTooltip.Root;
export const TooltipTrigger = RadixTooltip.Trigger;
export const TooltipContent = React.forwardRef<
  React.ElementRef<typeof RadixTooltip.Content>,
  React.ComponentPropsWithoutRef<typeof RadixTooltip.Content>
>(({ className, side = 'top', ...props }, ref) => (
  <RadixTooltip.Content
    ref={ref}
    side={side}
    className={
      'z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white shadow-md animate-in fade-in-0 zoom-in-95 ' +
      (className || '')
    }
    {...props}
  />
));
TooltipContent.displayName = 'TooltipContent'; 