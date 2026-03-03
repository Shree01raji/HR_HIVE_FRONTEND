import React, { useState, useEffect } from 'react';
import { FiShield, FiDownload, FiEye } from 'react-icons/fi';
import { insuranceAPI } from '../../services/api';

export default function InsuranceCards() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const data = await insuranceAPI.getMyCards();
      setCards(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching insurance cards:', err);
      setError('Failed to load insurance cards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Insurance Cards</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <FiShield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No insurance cards found</p>
          <p className="text-sm text-gray-500 mt-2">Contact HR to add your insurance cards</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div key={card.card_id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{card.insurance_type}</h3>
                  <p className="text-sm text-gray-600">{card.insurance_provider}</p>
                </div>
                {card.is_primary && (
                  <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-medium">
                    Primary
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">Policy Number:</span>
                  <span className="font-medium ml-2">{card.policy_number}</span>
                </div>
                {card.card_number && (
                  <div>
                    <span className="text-gray-600">Card Number:</span>
                    <span className="font-medium ml-2">{card.card_number}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Coverage:</span>
                  <span className="font-medium ml-2">
                    {card.coverage_amount ? `₹${parseFloat(card.coverage_amount).toLocaleString('en-IN')}` : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Valid From:</span>
                  <span className="font-medium ml-2">{new Date(card.coverage_start_date).toLocaleDateString()}</span>
                </div>
                {card.coverage_end_date && (
                  <div>
                    <span className="text-gray-600">Valid Until:</span>
                    <span className="font-medium ml-2">{new Date(card.coverage_end_date).toLocaleDateString()}</span>
                  </div>
                )}
                {card.dependent_count > 0 && (
                  <div>
                    <span className="text-gray-600">Dependents:</span>
                    <span className="font-medium ml-2">{card.dependent_count}</span>
                  </div>
                )}
              </div>
              {card.card_image_path && (
                <div className="mt-4 flex gap-2">
                  <button className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1">
                    <FiEye className="w-4 h-4" />
                    View Card
                  </button>
                  <button className="text-teal-600 hover:text-teal-800 text-sm flex items-center gap-1">
                    <FiDownload className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
