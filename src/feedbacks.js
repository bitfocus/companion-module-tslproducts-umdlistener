const { combineRgb } = require('@companion-module/base')

module.exports = {
	initFeedbacks() {
		let self = this
		const feedbacks = {}

		const foregroundColorWhite = combineRgb(255, 255, 255) // White
		const backgroundColorRed = combineRgb(255, 0, 0) // Red

		feedbacks['tallyState'] = {
			type: 'boolean',
			name: 'Show Tally State On Button',
			description: 'Indicate if Selected Address Tally is in X State',
			style: {
				color: foregroundColorWhite,
				bgcolor: backgroundColorRed,
			},
			options: [
				{
					type: 'dropdown',
					label: 'Tally Address',
					id: 'address',
					default: self.CHOICES_TALLYADDRESSES[0].id,
					choices: self.CHOICES_TALLYADDRESSES,
				},
				{
					type: 'dropdown',
					label: 'Tally Number',
					id: 'number',
					default: 'tally2',
					choices: [
						{ id: 'tally1', label: 'PVW' },
						{ id: 'tally2', label: 'PGM' },
					],
				},
				{
					type: 'dropdown',
					label: 'Indicate in X Status',
					id: 'state',
					default: 1,
					choices: [
						{ id: 0, label: 'Off' },
						{ id: 1, label: 'On' },
					],
				},
			],
			callback: function (feedback) {
				let opt = feedback.options

				let tallyObj = self.TALLIES.find((tally) => tally.address == opt.address)

				if (tallyObj) {
					if (tallyObj[opt.number] == opt.state) {
						return true
					}
				}

				return false
			},
		}

		self.setFeedbackDefinitions(feedbacks)
	},
}
