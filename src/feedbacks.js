module.exports = {
    // ##########################
    // #### Define Feedbacks ####
    // ##########################
    feedbacks() {
        let self = this;
        const feedbacks = {};

        const foregroundColorWhite = self.rgb(255, 255, 255) // White
        const foregroundColorBlack = self.rgb(0, 0, 0) // Black
        const backgroundColorRed = self.rgb(255, 0, 0) // Red
        const backgroundColorGreen = self.rgb(0, 255, 0) // Green
        const backgroundColorOrange = self.rgb(255, 102, 0) // Orange

        feedbacks['tallyState'] = {
            type: 'boolean',
            label: 'Show Tally State On Button',
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
                    choices: self.CHOICES_TALLYADDRESSES
                },
				{
                    type: 'dropdown',
                    label: 'Tally Number',
                    id: 'number',
                    default: 'tally2',
                    choices: [
                        { id: 'tally1', label: 'PVW' },
						{ id: 'tally2', label: 'PGM' },
                    ]
                },
                {
                    type: 'dropdown',
                    label: 'Indicate in X Status',
                    id: 'state',
                    default: 1,
                    choices: [
                        { id: 0, label: 'Off' },
                        { id: 1, label: 'On' }
                    ]
                }
            ],
            callback: function (feedback) {
                let opt = feedback.options;

				let tallyObj = self.TALLIES.find((tally) => tally.address == opt.address);
				
				if (tallyObj) {
					if (tallyObj[opt.number] == opt.state) {
						return true;
					}
				}			

                return false;
            }
        }

        self.setFeedbackDefinitions(feedbacks);
    }
}