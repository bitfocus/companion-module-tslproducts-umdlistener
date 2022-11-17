module.exports = {
	presets() {
		let self = this;
		
		const presets = []

		for (let i = 0; i < self.TALLIES.length; i++) {
			presets.push({
				category: 'Tally State',
				label: `${self.TALLIES[i].label} Tally State`,
				bank: {
					style: 'text',
					text: `$(tslumd-listener:tally_${self.TALLIES[i].address}_label)`,
					size: '18',
					color: '16777215',
					bgcolor: self.rgb(0, 0, 0)
				},
				actions: [
				],
				feedbacks: [
					{
						type: 'tallyState',
						options: {
							address: self.TALLIES[i].address,
							number: 'tally1',
							option: 1
						},
						style: {
							color: foregroundColor,
							bgcolor: backgroundColorGreen
						}
					},
					{
						type: 'tallyState',
						options: {
							address: self.TALLIES[i].address,
							number: 'tally2',
							option: 1
						},
						style: {
							color: foregroundColor,
							bgcolor: backgroundColorRed
						}
					}
				]
			});
		}

		this.setPresetDefinitions(presets)
	},
}
