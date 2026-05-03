interface NavbarProps {
  title: string;
  userName: string | undefined;
  onLogout: () => void;
}

export default function Navbar({ title, userName, onLogout }: NavbarProps) {
  return (
    <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-white">
      <span className="text-md font-semibold text-black">{title}</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500 font-bold tracking-wide">{userName}</span>
        <button
          onClick={onLogout}
          className="text-sm text-blue-600 hover:underline font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
