import React, { useState } from 'react';
import axios from 'axios';

const ExpeditionTestPage = () => {
    const [diagnosticData, setDiagnosticData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const testExpedition = async () => {
        setLoading(true);
        setError(null);
        setDiagnosticData(null);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_BASE_URL}/api/shippings/test-expedition/`);
            setDiagnosticData(res.data);
        } catch (err) {
            console.error("Diagnostic failed:", err);
            setError(err.response?.data?.error || err.message || "Failed to fetch diagnostic data");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Expedition Diagnostic Tool</h1>
                            <p className="text-gray-500 mt-2">Test connectivity and data fetching for Indonesia Expedition API (API.co.id)</p>
                        </div>
                        <button 
                            onClick={testExpedition}
                            disabled={loading}
                            className={`px-6 py-3 rounded-2xl font-bold transition-all duration-300 transform active:scale-95 ${
                                loading 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200'
                            }`}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Running Test...
                                </span>
                            ) : 'Run Diagnostic Test'}
                        </button>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl">
                            <div className="flex items-center gap-3">
                                <span className="material-icons-outlined text-red-500">error</span>
                                <p className="text-red-700 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {diagnosticData && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">API Key Configured</p>
                                    <div className="flex items-center gap-2">
                                        {diagnosticData.api_configured ? (
                                            <span className="flex items-center gap-1 text-green-600 font-bold">
                                                <span className="material-icons text-sm">check_circle</span> Yes
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 font-bold">
                                                <span className="material-icons text-sm">cancel</span> No (Missing in .env)
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                    <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider mb-1">Items Found</p>
                                    <p className="text-2xl font-black text-indigo-900">{diagnosticData.count || 0} Provinces</p>
                                </div>
                            </div>

                            <div className="p-6 bg-gray-900 rounded-2xl overflow-hidden">
                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Raw Response Data</p>
                                <pre className="text-indigo-100 text-sm overflow-x-auto custom-scrollbar font-mono">
                                    {JSON.stringify(diagnosticData.provinces, null, 2)}
                                </pre>
                            </div>

                            {diagnosticData.error && (
                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-200">
                                    <div className="flex items-start gap-4">
                                        <div className="p-2 bg-amber-200 rounded-lg">
                                            <span className="material-icons text-amber-700">warning</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-amber-900">Backend Warning</h3>
                                            <p className="text-amber-800 text-sm mt-1">{diagnosticData.error}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {!diagnosticData && !loading && !error && (
                        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl">
                            <span className="material-icons text-gray-300 text-6xl mb-4">analytics</span>
                            <p className="text-gray-400 font-medium">Click the button above to start the diagnostic process</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExpeditionTestPage;
