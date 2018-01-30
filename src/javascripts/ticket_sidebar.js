import View from 'view';
import Storage from 'storage';

const MAX_SUBJECT_LENGTH = 35;

class TicketSidebar {
	constructor(client, data) {
		this.client = client;
		this._metadata = data.metadata;
		this._context = data.context;
		this.requester = null;
		this.showing_all = false;
		this.list_length = this._metadata.settings.list_length;
		this.show_satisfaction = this._metadata.settings.show_satisfaction;

		this.storage = new Storage(this._metadata.installationId);
		this.view = new View({ afterRender: () => {
			let docHeight = $('html').height();
			let docWidth = $('html').width();
			$('.container-fluid').css('font-size', docWidth / 30 + 'px');
			this.client.invoke('resize', { height: docHeight });
		}});

		this.view.switchTo('loading');

		this.getRequester().then(data => {
			this.requester = data['ticket.requester'];

			this.getRecentTickets().then(data => {
				this.renderMain(data, false);
			}).catch(err => {
				console.error(err);
				this.renderError(err);
			});
		});
	}

	attachEvents() {
		$('.ticket-link').not('.active').click((e) => {
			e.preventDefault();

			this.client.invoke('instances.create', {
				location: 'modal',
				url: 'assets/index.html?ticket_id=' + $(e.currentTarget).data('ticket-id')
			});
		});

		$('#show_all').click((e) => {
			e.preventDefault();

			this.showing_all = true;

			this.getRecentTickets().then(data => {
				this.view.switchTo('loading');
				this.renderMain(data, true);
			}).catch(err => {
				console.error(err);
				this.renderError(err);
			});
		});
	}

	getCurrentUser() {
		return this.client.request({ url: '/api/v2/users/me.json' });
	}

	renderMain(data, show_all) {
		let template_data = {};
		let display_tickets = data.tickets;

		if (!show_all && data.tickets.length > this.list_length) {
			display_tickets = data.tickets.slice(0, this.list_length);
			this.showing_all = false;
		} else {
			this.showing_all = true;
		}

		this.formatTickets(display_tickets).then(tickets => {
			template_data.ticket_count = data.count;
			template_data.recent_tickets = tickets;
			template_data.requester = this.requester;
			template_data.showing_all = this.showing_all;
			template_data.show_satisfaction = this.show_satisfaction;

			this.sortTickets(template_data.recent_tickets, 'created_at', 'desc')
			this.view.switchTo('main', template_data);
			this.attachEvents();

			$('[data-toggle="tooltip"]').tooltip({
				template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner small"></div></div>',
				delay: { show: 500, hide: 0 }
			});
		}).catch(err => {
			console.error(err);
			this.renderError(err);
		});
	}

	renderError(err) {
		this.view.switchTo('error', err);
	}

	getRequester() {
		return this.client.get('ticket.requester');
	}

	getRecentTickets() {
		return this.client.request({ url: `/api/v2/users/${this.requester.id}/tickets/requested.json?sort_by=created_at&sort_order=desc` });
	}

	formatTickets(recent_tickets) {
		return new Promise((resolve, reject) => {
			let formatted_tickets = [];
			let curr_ticket_id = this._context.ticketId;

			for (let i = 0, len = recent_tickets.length; i < len; i++) {
				let ticket = recent_tickets[i];

				let formatted_ticket = {
					created_at_relative: moment(ticket.created_at).fromNow(),
					created_at_static: moment(ticket.created_at).format('LLL'),
					created_at: ticket.created_at,
					id: ticket.id,
					truncated_subject: null,
					subject: ticket.subject,
					assignee_id: ticket.assignee_id,
					assignee_name: null,
					status: ticket.status,
					current_ticket: false,
					satisfaction_score: 'unknown',
					satisfaction_symbol: ''
				};  

				if (ticket.satisfaction_rating.score) {
					formatted_ticket.satisfaction_score = ticket.satisfaction_rating.score;

					switch (ticket.satisfaction_rating.score) {
						case 'good':
							formatted_ticket.satisfaction_symbol = '<span class="glyphicon glyphicon-circle-arrow-up" aria-hidden="true">';
							break;
						case 'bad':
							formatted_ticket.satisfaction_symbol = '<span class="glyphicon glyphicon-circle-arrow-down" aria-hidden="true">';
							break;
						case 'offered':
							formatted_ticket.satisfaction_symbol = '<span class="glyphicon glyphicon-time" style="opacity:0.5;" aria-hidden="true">';
							break;
						default:
							formatted_ticket.satisfaction_symbol = '';
					}
				}

				formatted_ticket.current_ticket = (ticket.id === curr_ticket_id);

				if (ticket.subject && ticket.subject.length > MAX_SUBJECT_LENGTH) {
					formatted_ticket.truncated_subject = this.truncateText(formatted_ticket.subject, MAX_SUBJECT_LENGTH);
				}

				if (ticket.assignee_id) {
					this.getUserById(ticket.assignee_id).then((data) => {
						if (!data) {
							reject('Not user data found.');
						}

						formatted_ticket.assignee_name = this.formatAssigneeName(data.user.name);
						formatted_tickets.push(formatted_ticket);

						if (formatted_tickets.length === recent_tickets.length) {
							resolve(formatted_tickets);
						}
					});
				} else {
					formatted_tickets.push(formatted_ticket);

					if (formatted_tickets.length === recent_tickets.length) {
						resolve(formatted_tickets);
					}
				}
			}
		});
	}

	sortTickets(tickets, field, direction) {
		tickets.sort((a, b) => {
			if (field === 'created_at') {
				if (moment(a.created_at).isBefore(moment(b.created_at))) {
					return direction === 'desc' ? 1 : -1;
				} else if (moment(b.created_at).isBefore(moment(a.created_at))) {
					return direction === 'desc' ? -1 : 1;
				} else {
					return 0;
				}
			}
		});
	}

	truncateText(text, len) {
		if (text.length > len) {
			return text.substring(0, len + 1) + '...';
		}

		return text;
	}

	formatAssigneeName(name) {
		let parts = name.split(' ');

		if (parts.length < 2) {
			return name;
		}

		return parts[0] + ' ' + parts[1].substring(0, 1) + '.';
	} 

	getUserById(id) {
		return this.client.request({ url: `/api/v2/users/${id}.json` });
	}
}

export default TicketSidebar;