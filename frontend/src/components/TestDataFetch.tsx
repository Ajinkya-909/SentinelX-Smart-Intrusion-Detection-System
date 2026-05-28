import React, { useEffect, useState } from 'react';
import {
  getJobInsights,
  getJobFindings,
  getJobResults,
} from '../services/report';

interface TestDataFetchProps {
  jobId: string;
}

export const TestDataFetch: React.FC<TestDataFetchProps> = ({ jobId }) => {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    const runTests = async () => {
      if (!jobId) return;

      try {
        const insightsData = await getJobInsights(jobId, 10, 0);
        const findingsData = await getJobFindings(jobId, 10, 0);
        const resultsData = await getJobResults(jobId, 10, 0);
        saveAllReports(insightsData, findingsData, resultsData);
        setData({
          insights: insightsData,
          findings: findingsData,
          results: resultsData,
        });
      } catch (err) {
        setError(err);
      }
    };

    runTests();
  }, [jobId]);

  if (error) {
    return (
      <pre>
        {JSON.stringify(error, null, 2)}
      </pre>
    );
  }

  const downloadJsonFile = (filename: string, data: any) => {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: 'application/json' }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};

const saveAllReports = (
  insightsData: any,
  findingsData: any,
  resultsData: any
) => {
  downloadJsonFile('insights', insightsData);
  downloadJsonFile('findings', findingsData);
  downloadJsonFile('results', resultsData);
};

  if (!data) {
    return <pre>Loading...</pre>;
  }

  return (
    <pre>
      {JSON.stringify(data, null, 2)}
    </pre>
  );
};