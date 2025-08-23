export default function BadgesList({ badges }) {
  if (!badges?.length) return <p className="text-gray-500">Nenhuma conquista ainda.</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {badges.map((badge, idx) => (
        <div key={idx} className="border p-4 rounded shadow bg-white dark:bg-gray-800">
          <div className="text-3xl mb-2">{badge.icon}</div>
          <h3 className="font-semibold">{badge.name}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">{badge.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            Recebido em: {new Date(badge.awardedAt).toLocaleDateString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
