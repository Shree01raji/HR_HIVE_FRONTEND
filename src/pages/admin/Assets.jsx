import React, { useEffect, useState } from 'react';

export default function AssetWorkflow() {
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const res = await assetAPI.getAll();
    setData(res.data);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Asset Requests</h1>
      {/* Table */}
    </div>
  );
}
