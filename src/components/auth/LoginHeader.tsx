const LoginHeader = () => {
  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center text-3xl shadow-md">
        🐾
      </div>
      <h2 className="text-xl font-extrabold tracking-wide text-slate-900">
        WELCOME BACK
      </h2>
      <p className="text-sm text-slate-500">Join our Community</p>
    </div>
  );
};

export default LoginHeader;
