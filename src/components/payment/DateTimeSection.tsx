interface DateTimeSectionProps {
	displayDate: string;
	displayTime: string;
}

export function DateTimeSection({
	displayDate,
	displayTime,
}: DateTimeSectionProps) {
	return (
		<section className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
			<h2 className="text-lg font-black text-[#4A2600] mb-3">Date & Time</h2>
			<div className="space-y-2 text-sm">
				<div className="flex items-center justify-between">
					<p className="text-gray-500">Date</p>
					<p className="font-semibold text-[#4A2600]">{displayDate}</p>
				</div>
				<div className="flex items-center justify-between">
					<p className="text-gray-500">Time</p>
					<p className="font-semibold text-[#4A2600]">{displayTime}</p>
				</div>
			</div>
		</section>
	);
}
