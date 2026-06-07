interface Activity {
  id: number;
  original_text: string;
  adapted_text: string;
  created_at: string;
}

interface Props {
  activity: Activity;
}

export default function ActivityCard({ activity }: Props) {
  const date = new Date(activity.created_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{date}</span>
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Adaptado</span>
      </div>

      <div>
        <p className="text-xs text-gray-400 mb-1">Texto adaptado</p>
        <p className="text-sm text-gray-700 line-clamp-3">{activity.adapted_text}</p>
      </div>

      {activity.original_text && (
        <details className="text-xs text-gray-400 cursor-pointer">
          <summary>Ver texto original</summary>
          <p className="mt-1 text-gray-500">{activity.original_text}</p>
        </details>
      )}
    </div>
  );
}
