import * as React from 'react';
import * as RadixSheet from '@radix-ui/react-dialog';

export const Sheet = RadixSheet.Root;
export const SheetTrigger = RadixSheet.Trigger;
export const SheetContent = React.forwardRef<
  React.ElementRef<typeof RadixSheet.Content>,
  React.ComponentPropsWithoutRef<typeof RadixSheet.Content> & { side?: 'left' | 'right' | 'top' | 'bottom' }
>(({ className, side = 'right', ...props }, ref) => (
  <RadixSheet.Portal>
    <RadixSheet.Overlay className="fixed inset-0 bg-black/30 z-40" />
    <RadixSheet.Content
      ref={ref}
      className={
        'fixed z-50 bg-white shadow-lg transition-all ' +
        (side === 'left' ? 'left-0 top-0 h-full w-80' : '') +
        (side === 'right' ? 'right-0 top-0 h-full w-80' : '') +
        (side === 'top' ? 'top-0 left-0 w-full h-80' : '') +
        (side === 'bottom' ? 'bottom-0 left-0 w-full h-80' : '') +
        (className ? ' ' + className : '')
      }
      {...props}
    />
  </RadixSheet.Portal>
));
SheetContent.displayName = 'SheetContent'; 