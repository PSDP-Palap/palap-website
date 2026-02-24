const RegisterHeader = () => {
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl shadow-md">
        🐾
      </div>
      <h2 className="text-xl font-extrabold tracking-wide text-slate-900">
        CREATE ACCOUNT
      </h2>
      <p className="text-xs text-slate-500">Join our pet care service</p>
    </div>
  );
};

export default RegisterHeader;

