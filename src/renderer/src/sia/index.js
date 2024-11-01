async function spawnWorker(params, timeout, progress) {
	let worker = new Worker(new URL('./sia.worker.js', import.meta.url), { type: 'module' });

	const work = new Promise((resolve, reject) => {
		const workerDeadline = setTimeout(() => {
			reject(new Error('response timeout'));
		}, timeout);

		worker.onmessage = (e) => {
			const data = e.data;

			clearTimeout(workerDeadline);

			if (data === 'ready') {
				worker.postMessage(params);
				return;
			}

			if (!Array.isArray(data)) {
				console.error(data);
				return reject(new Error('unexpected data'));
			}

			switch (data[0]) {
			case 'log':
				console.debug(data[1]);
				return;
			case 'progress':
				if (typeof progress !== 'function')
					return;

				progress(data[1]);
				return;
			case null:
				resolve(data[1]);
				return;
			default:
				reject(new Error(data[0]));
			}
		};
	});

	work.finally(() => {
		worker.terminate();
		worker = null;
	});

	return work;
}

export function generateSeed(type) {
	return spawnWorker(['generateSeed', type], 15000);
}

export function generateAddresses(seed, currency, i, n) {
	return spawnWorker(['generateAddresses', seed, currency, i, n], 15000);
}

export function signTransactions(seed, currency, unsigned) {
	return spawnWorker(['signTransactions', seed, currency, JSON.stringify(unsigned)], 15000);
}

export function getTransactions(addresses, walletCurrency, displayCurrency) {
	return spawnWorker(['getTransactions', addresses, walletCurrency, displayCurrency], 30000);
}

export async function exportTransactions(addresses, walletCurrency, displayCurrency, min, max, progress) {
	return spawnWorker(['exportTransactions', addresses, walletCurrency, displayCurrency, min, max], 300000, progress);
}

export function signTransaction(seed, currency, txn, indexes) {
	return spawnWorker(['signTransaction', seed, currency, JSON.stringify(txn), indexes], 15000);
}

export function encodeTransaction(txn) {
	return spawnWorker(['encodeTransaction', JSON.stringify(txn)], 15000);
}

export function encodeUnlockHash(unlockconditions) {
	return spawnWorker(['encodeUnlockHash', JSON.stringify(unlockconditions)], 15000);
}

export function encodeUnlockHashes(unencoded) {
	return spawnWorker(['encodeUnlockHashes', unencoded.map(u => JSON.stringify(u))], 15000);
}

export async function recoverAddresses(seed, currency, i = 0, lookahead = 25000, last = 0, progress) {
	return spawnWorker(['recoverAddresses', seed, currency, i, lookahead, last], 300000, progress);
}