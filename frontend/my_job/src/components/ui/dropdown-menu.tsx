import * as React from 'react';
import * as RadixDropdownMenu from '@radix-ui/react-dropdown-menu';

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;
export const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof RadixDropdownMenu.Content>,
  React.ComponentPropsWithoutRef<typeof RadixDropdownMenu.Content>
>(({ className, ...props }, ref) => (
  <RadixDropdownMenu.Content
    ref={ref}
    className={
      'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-gray-900 shadow-md ' +
      (className || '')
    }
    {...props}
  />
));
DropdownMenuContent.displayName = 'DropdownMenuContent';
export const DropdownMenuLabel = RadixDropdownMenu.Label;
export const DropdownMenuItem = RadixDropdownMenu.Item;
export const DropdownMenuSeparator = RadixDropdownMenu.Separator; 