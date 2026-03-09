interface TagProps {
  children: React.ReactNode;
  color?: "green" | "orange" | "red" | "blue" | "yellow" | "default";
}

export function Tag({ children, color = "default" }: TagProps) {
  return (
    <span className={`tag ${color !== "default" ? color : ""}`}>
      {children}
    </span>
  );
}
