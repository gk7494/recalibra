/**
 * Inspection card component - client-only
 */

import React, { useState, useEffect } from 'react';
import { getInspectionImages } from '../db';
import type { Inspection } from '../types';

interface InspectionCardProps {
  inspection: Inspection;
  onInfo: (inspection: Inspection) => void;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
  selected?: boolean;
  onSelect?: (id: string) => void;
}

export const InspectionCard: React.FC<InspectionCardProps> = ({
  inspection,
  onInfo,
  onPlay,
  onDelete,
  selected = false,
  onSelect,
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const isProcessing = inspection.status === 'processing';
  const isCompleted = inspection.status === 'completed';
  const isFailed = inspection.status === 'failed';

  useEffect(() => {
    if (inspection.imageIds.length > 0) {
      getInspectionImages(inspection.id).then((urls) => {
        if (urls.length > 0) setThumbnailUrl(urls[0]);
      });
    }
    return () => {
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [inspection.id, inspection.imageIds.length]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 flex flex-col hover:shadow-lg transition-shadow border-2 ${
      selected ? 'border-blue-500 bg-blue-50' : 'border-transparent'
    }`}>
      <div className="flex items-center justify-between mb-2">
        {onSelect && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(inspection.id)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
        )}
        <span className="text-xs font-semibold text-gray-500">
          {inspection.imageIds.length} Image{inspection.imageIds.length !== 1 ? 's' : ''}
        </span>
        {isCompleted && (
          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            Completed
          </span>
        )}
        {isFailed && (
          <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
            Failed
          </span>
        )}
      </div>

      {thumbnailUrl && (
        <img
          src={thumbnailUrl}
          alt="Thumbnail"
          className="w-full h-32 object-cover rounded mb-3"
        />
      )}

      <h3 className="font-bold text-gray-900 mb-2">{inspection.name}</h3>

      {isProcessing && (
        <>
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${inspection.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mb-2">Processing... {inspection.progress}%</p>
        </>
      )}

      {isCompleted && inspection.summaryText && (
        <p className="text-sm text-gray-700 mb-2 line-clamp-2">{inspection.summaryText}</p>
      )}

      {isFailed && inspection.failureReason && (
        <p className="text-sm text-red-600 mb-2">Error: {inspection.failureReason}</p>
      )}

      <div className="flex justify-between items-center mt-auto pt-2 border-t">
        <button
          onClick={() => onInfo(inspection)}
          className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Info
        </button>
        <div className="flex items-center space-x-2">
          {!isProcessing && !isCompleted && (
            <button
              onClick={() => onPlay(inspection.id)}
              className="p-1.5 rounded-full bg-green-100 text-green-600 hover:bg-green-200"
              title="Start Processing"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
          <button
            onClick={() => onDelete(inspection.id)}
            className="p-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
            title={isProcessing ? "Cancel and Delete Inspection" : "Delete Inspection"}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 11-2 0v6a1 1 0 112 0V8z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

