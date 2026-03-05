import { StatCards } from './StatCards'; 
import { JobItem } from './JobItem';

export const DashboardContent = () => {
  const mockJobs = [
    { id: 1, title: 'รับ - ส่ง', description: 'รายละเอียด รายละเอียด รายละเอียด...', price: 10, status: 'Wait' },
    { id: 2, title: 'รับ - ส่ง', description: 'รายละเอียด รายละเอียด รายละเอียด...', price: 10, status: 'Wait' },
    { id: 3, title: 'รับ - ส่ง', description: 'รายละเอียด รายละเอียด รายละเอียด...', price: 10, status: 'Wait' },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <section>
        <h2 className="text-4xl font-bold mb-6">Dashboard</h2>
        <div className="flex gap-6">
          <StatCards label="Current Earning" value="$ 1 M" />
          <StatCards label="Upcoming Jobs" value="3" />
        </div>
      </section>

      {/* List Section */}
      <section>
        <h2 className="text-4xl font-bold mb-6">Upcoming Jobs</h2>
        <div className="space-y-4">
          {mockJobs.map((job) => (
            <JobItem 
              key={job.id}
              title={job.title}
              description={job.description}
              price={job.price}
              status={job.status}
            />
          ))}
        </div>
      </section>
    </div>
  );
};