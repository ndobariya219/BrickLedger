// PortfolioSummaryWidget: Exclude sold properties (sale date in the past)
import React from 'react';

export default function PortfolioSummaryWidget({ properties, ...props }: { properties: any[] }) {
	// Exclude sold properties with saleDate in the past
	const now = new Date();
	const activeProperties = (properties || []).filter(p => p.status !== 'sold' || !p.saledate || new Date(p.saledate) > now);

	// Example summary: Portfolio Value
	const totalValue = activeProperties.reduce((sum, p) => sum + (p.currentvalue || 0), 0);

	return (
		<>
			<div style={{ padding: 16, background: '#fff', borderRadius: 12, marginBottom: 16 }}>
				<h2>Portfolio Summary</h2>
				<div>Portfolio Value: ${totalValue.toLocaleString()}</div>
				<div>Active Properties: {activeProperties.length}</div>
				<div>Excluded (Sold): {(properties.length - activeProperties.length)}</div>
			</div>
		</>
	);
}
