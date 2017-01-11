import View from 'view';
import Storage from 'storage';

const MAX_HEIGHT = 375;
const MAX_SUBJECT_LENGTH = 40;
const MAX_DESCRIPTION_LENGTH = 150;

class TicketSidebar {
	constructor(client, data) {
		this.client = client;
		this._metadata = data.metadata;
		this._context = data.context;
		this.requester = null;
		this.showing_all = false;
		this.list_length = this._metadata.settings.list_length;

		this.storage = new Storage(this._metadata.installationId);
		this.view = new View({ afterRender: () => {
			let newHeight = Math.min($('html').height(), MAX_HEIGHT);
			this.client.invoke('resize', { height: newHeight, width: '100%' });
		}});

		this.getRequester().then(data => {
			this.requester = data['ticket.requester'];

			this.getRecentTickets().then(data => {
				this.renderMain(data, false);
				this.view.switchTo('loading');
			});
		});
	}

	attachEvents() {
		$('.ticket-link').not('.active').click((e) => {
			e.preventDefault();

			this.client.invoke('instances.create', {
				location: 'modal',
				url: 'assets/index.html?ticket_id=' + $(e.currentTarget).data('ticket-id')
			}).then((modalContext) => {
				// The modal is on the screen now!
				let modalClient = this.client.instance(modalContext['instances.create'][0].instanceGuid);
				modalClient.on('modal.close', function() {
				  // The modal has been closed.
				});
			});
		});

		$('#show_all').click((e) => {
			e.preventDefault();

			this.showing_all = true;

			this.getRecentTickets().then(data => {
				this.view.switchTo('loading');
				this.renderMain(data, true);
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

		this.formatTickets(display_tickets, (tickets) => {
			template_data.ticket_count = data.count;
			template_data.recent_tickets = tickets;
			template_data.requester = this.requester;
			template_data.showing_all = this.showing_all;

			this.sortTickets(template_data.recent_tickets, 'created_at', 'desc')
			this.view.switchTo('main', template_data);
			this.attachEvents();

			$('[data-toggle="tooltip"]').tooltip({
				template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner small"></div></div>'
			});
		});
	}

	getRequester() {
		return this.client.get('ticket.requester');
	}

	getRecentTickets() {
		return this.client.request({ url: `/api/v2/users/${this.requester.id}/tickets/requested.json?sort_by=created_at&sort_order=desc` });
	}

	formatTickets(recent_tickets, callback) {
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
				current_ticket: false
			};  

			if (ticket.id === curr_ticket_id) {
				formatted_ticket.current_ticket = true;
			}

			if (ticket.subject.length > MAX_SUBJECT_LENGTH) {
				formatted_ticket.truncated_subject = this.truncateSubject(ticket.subject);
			}

			if (ticket.assignee_id) {
				this.getUserById(ticket.assignee_id).then((data) => {
					formatted_ticket.assignee_name = this.formatAssigneeName(data.user.name);
					formatted_tickets.push(formatted_ticket);

					if (formatted_tickets.length === recent_tickets.length) {
						return callback(formatted_tickets);
					}
				});
			} else {
				formatted_ticket.assignee_name = 'Unassigned';
				formatted_tickets.push(formatted_ticket);

				if (formatted_tickets.length === recent_tickets.length) {
					return callback(formatted_tickets);
				}
			}
		}
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

	truncateSubject(subject) {
		if (subject.length > MAX_SUBJECT_LENGTH) {
			return subject.substring(0, MAX_SUBJECT_LENGTH + 1) + '...';
		}

		return subject;
	}

	formatAssigneeName(name) {
		let parts = name.split(' ');
		let first_initial = '';

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
