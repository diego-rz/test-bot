const axios = require('axios')
require('dotenv').config()

// Number of measurements to calculate EMA
const VALUES_LENGHT = 10

// Measurement frequency in ms
const FREQUENCY_MS = 60000

// Constant to calculate EMA
const MULT = 2 / (VALUES_LENGHT + 1)

// Number of measurements necessary to consider an asset trenging change
const TREND_CHANGE_CONDITION = 4

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/*
Calculate the current EMA from current price and previous EMA
*/
const ema = (price, previousEma) => (price - previousEma) * MULT + previousEma

let money = 100
let assetQuantity = 0

const buy = (assetPrice) => {
	if (money != 0) {
		assetQuantity = money / assetPrice
		money = 0
	}
}

const sell = (assetPrice) => {
	if (assetQuantity != 0) {
		money = assetQuantity * assetPrice
		assetQuantity = 0
	}
}

/*
Get the current asset value trending
*/
const getTrend = (emas, currentTrend) => {
	if (emas.length < TREND_CHANGE_CONDITION) return currentTrend

	if (currentTrend === 'Stable') {
		const lastTwoEma = emas[Math.max(emas.length - 2, 0)] - emas[Math.max(emas.length - 1, 0)]
		if (lastTwoEma > 0) return 'Downward'
		else if (lastTwoEma < 0) return 'Upward'
		else return 'Stable'
	}

	const lasts = emas.slice(emas.length - TREND_CHANGE_CONDITION)
	for (let i = 1; i < lasts.length; i++) {
		if (currentTrend === 'Downward') {
			if (lasts[i] < lasts[i - 1]) return 'Downward'
			return 'Upward'
		} else if (currentTrend === 'Upward') {
			if (lasts[i] > lasts[i - 1]) return 'Upward'
			return 'Downward'
		}

	}
}


async function run() {
	let lastValues = []
	let valuesEma = []
	let trend = "Stable"

	while (true) {

		let measur = undefined
		axios.get(process.env.ASSET_VALUE_API_URL).then(response => {
			measur = response.data
			console.log({ id: measur.data.id, priceUsd: measur.data.priceUsd, date: new Date(measur.timestamp) })

			const priceNum = new Number(measur.data.priceUsd)
			lastValues.push(priceNum)
			if (lastValues.length > VALUES_LENGHT) lastValues.splice(0, 1)

			valuesEma.push(ema(priceNum, valuesEma[valuesEma.length - 1] ?? priceNum))
			if (valuesEma.length > VALUES_LENGHT) valuesEma.splice(0, 1)

			console.log(lastValues.map(value => value.valueOf()))
			console.log(valuesEma)

			const newTrend = getTrend(valuesEma, trend)
			if ((trend === 'Upward' || trend === 'Stable') && newTrend === 'Downward') {
				sell(priceNum)
				trend = newTrend
			}
			else if ((trend === 'Downward' || trend === 'Stable') && newTrend === 'Upward') {
				buy(priceNum)
				trend = newTrend
			}

			console.log(`${trend} trend`)
			console.log(`Money: $${money}`)
			console.log(`Assets: ${assetQuantity}`)
			console.log('-------')

		}).catch(error => {
			console.log(`Cannot retrieve remote data. Message: ${error.message}`)
		})
		await sleep(FREQUENCY_MS)
	}
}

run()

