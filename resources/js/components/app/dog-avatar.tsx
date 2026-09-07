interface DogAvatarProps {
  name: string
  className?: string
}

export function DogAvatar({ name, className }: DogAvatarProps) {
  return (
    <span
      className={
        'flex size-13 flex-none items-center justify-center rounded-full border bg-muted text-xl font-semibold text-muted-foreground' +
        (className ? ' ' + className : '')
      }
    >
      {name.charAt(0)}
    </span>
  )
}
