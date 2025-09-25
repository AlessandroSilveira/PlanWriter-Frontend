// src/components/Alert.jsx
export default function Alert({ type = "info", children }) {
  const base = "rounded-md px-3 py-2 text-sm mt-2";
  const styles = {
    success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    info: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };
  return (
    <div className={`${base} ${styles[type] || styles.info}`}>
      {children}
    </div>
  );
}
