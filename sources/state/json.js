/**
 * Export current state as JSON string
 */
export function exportStateAsJSON(selections, bodyType) {
  const state = {
	version: '1.0',
	bodyType: bodyType,
	selections: selections
  };
  return JSON.stringify(state, null, 2);
}

/**
 * Import state from JSON string
 */
export function importStateFromJSON(jsonString) {
  try {
	const state = JSON.parse(jsonString);
	if (!state.version || !state.bodyType || !state.selections) {
	  throw new Error('Invalid JSON format');
	}
	return {
	  bodyType: state.bodyType,
	  selections: state.selections
	};
  } catch (err) {
	console.error('Failed to parse JSON:', err);
	throw err;
  }
}
