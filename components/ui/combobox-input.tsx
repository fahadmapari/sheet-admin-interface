'use client';

import { useRef, useState } from 'react';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';

interface ComboboxInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function ComboboxInput({
  id,
  value,
  onChange,
  options,
  placeholder,
  className,
  required,
}: ComboboxInputProps) {
  const [open, setOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = isTyping
    ? options.filter((opt) => opt.toLowerCase().includes(value.toLowerCase()))
    : options;

  function handleSelect(opt: string) {
    onChange(opt);
    setOpen(false);
    setIsTyping(false);
    inputRef.current?.blur();
  }

  return (
    <Popover open={open && filtered.length > 0} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setIsTyping(true);
          }}
          onFocus={() => { setOpen(true); setIsTyping(false); }}
          placeholder={placeholder}
          className={className}
          required={required}
          autoComplete="new-password"
        />
      </PopoverAnchor>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (inputRef.current?.contains(e.target as Node)) e.preventDefault();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList>
            <CommandGroup>
              {filtered.map((opt) => (
                <CommandItem key={opt} value={opt} onSelect={() => handleSelect(opt)}>
                  {opt}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
