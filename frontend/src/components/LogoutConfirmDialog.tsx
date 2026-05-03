interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function LogoutConfirmDialog({
  isOpen,
  onConfirm,
  onCancel,
}: LogoutConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg py-6 px-12 max-w-md">
        <h3 className="text-lg text-center font-semibold text-black mb-1">
          Confirm Logout?
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to log out?
        </p>
        <div className="flex gap-1 justify-end">
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
