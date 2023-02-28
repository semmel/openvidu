import {
	AfterViewInit,
	ChangeDetectionStrategy,
	ChangeDetectorRef,
	Component,
	ContentChild,
	EventEmitter,
	HostListener,
	OnDestroy,
	OnInit,
	Output,
	TemplateRef,
	ViewChild
} from '@angular/core';
import { skip, Subscription } from 'rxjs';
import { ChatService } from '../../services/chat/chat.service';
import { DocumentService } from '../../services/document/document.service';
import { PanelService } from '../../services/panel/panel.service';

import { MediaChange } from '@angular/flex-layout';
import { MatMenuTrigger } from '@angular/material/menu';
import { Session } from 'openvidu-browser';
import {
	ToolbarAdditionalButtonsDirective,
	ToolbarAdditionalPanelButtonsDirective
} from '../../directives/template/openvidu-angular.directive';
import { BroadcastingStatus } from '../../models/broadcasting.model';
import { ChatMessage } from '../../models/chat.model';
import { ILogger } from '../../models/logger.model';
import { PanelEvent, PanelType } from '../../models/panel.model';
import { OpenViduRole, ParticipantAbstractModel } from '../../models/participant.model';
import { RecordingInfo, RecordingStatus } from '../../models/recording.model';
import { ActionService } from '../../services/action/action.service';
import { BroadcastingService } from '../../services/broadcasting/broadcasting.service';
import { OpenViduAngularConfigService } from '../../services/config/openvidu-angular.config.service';
import { DeviceService } from '../../services/device/device.service';
import { LayoutService } from '../../services/layout/layout.service';
import { LoggerService } from '../../services/logger/logger.service';
import { OpenViduService } from '../../services/openvidu/openvidu.service';
import { ParticipantService } from '../../services/participant/participant.service';
import { PlatformService } from '../../services/platform/platform.service';
import { RecordingService } from '../../services/recording/recording.service';
import { StorageService } from '../../services/storage/storage.service';
import { TranslateService } from '../../services/translate/translate.service';

/**
 *
 * The **ToolbarComponent** is hosted inside of the {@link VideoconferenceComponent}.
 * It is in charge of displaying the participants controlls for handling the media, panels and more videoconference features.
 *
 * <div class="custom-table-container">
 * <div>
 *  <h3>API Directives</h3>
 *
 * This component allows us to show or hide certain HTML elements with the following {@link https://angular.io/guide/attribute-directives Angular attribute directives}
 * with the aim of fully customizing the ToolbarComponent.
 *
 * | **Name**                  | **Type**  | **Reference**                                   |
 * | :----------------------------: | :-------: | :---------------------------------------------: |
 * | **screenshareButton**       | `boolean` | {@link ToolbarScreenshareButtonDirective}       |
 * | **fullscreenButton**        | `boolean` | {@link ToolbarFullscreenButtonDirective}        |
 * | **backgroundEffectsButton** | `boolean` | {@link ToolbarBackgroundEffectsButtonDirective} |
 * | **leaveButton**             | `boolean` | {@link ToolbarLeaveButtonDirective}             |
 * | **chatPanelButton**         | `boolean` | {@link ToolbarChatPanelButtonDirective}         |
 * | **participantsPanelButton** | `boolean` | {@link ToolbarParticipantsPanelButtonDirective} |
 * | **displayLogo**             | `boolean` | {@link ToolbarDisplayLogoDirective}             |
 * | **displaySessionName**      | `boolean` | {@link ToolbarDisplaySessionNameDirective}      |
 *
 * <p class="component-link-text">
 * <span class="italic">See all {@link ApiDirectiveModule API Directives}</span>
 * </p>
 *
 * </div>
 * <div>
 *
 * <h3>OpenVidu Angular Directives</h3>
 *
 * The ToolbarComponent can be replaced with a custom component. It provides us the following {@link https://angular.io/guide/structural-directives Angular structural directives}
 * for doing this.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |           ***ovToolbar**           |            {@link ToolbarDirective}           |
 *
 * </br>
 *
 * It is also providing us a way to **add additional buttons** to the default toolbar.
 * It will recognise the following directive in a child element.
 *
 * |            **Directive**           |                 **Reference**                 |
 * |:----------------------------------:|:---------------------------------------------:|
 * |   ***ovToolbarAdditionalButtons**   |   {@link ToolbarAdditionalButtonsDirective}   |
 * |***ovToolbarAdditionalPanelButtons**   |   {@link ToolbarAdditionalPanelButtonsDirective}   |
 *
 * <p class="component-link-text">
 * 	<span class="italic">See all {@link OpenViduAngularDirectiveModule OpenVidu Angular Directives}</span>
 * </p>
 * </div>
 * </div>
 */

@Component({
	selector: 'ov-toolbar',
	templateUrl: './toolbar.component.html',
	styleUrls: ['./toolbar.component.css'],
	changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToolbarComponent implements OnInit, OnDestroy, AfterViewInit {
	/**
	 * @ignore
	 */
	@ContentChild('toolbarAdditionalButtons', { read: TemplateRef }) toolbarAdditionalButtonsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild('toolbarAdditionalPanelButtons', { read: TemplateRef }) toolbarAdditionalPanelButtonsTemplate: TemplateRef<any>;

	/**
	 * @ignore
	 */
	@ContentChild(ToolbarAdditionalButtonsDirective)
	set externalAdditionalButtons(externalAdditionalButtons: ToolbarAdditionalButtonsDirective) {
		// This directive will has value only when ADDITIONAL BUTTONS component tagget with '*ovToolbarAdditionalButtons' directive
		// is inside of the TOOLBAR component tagged with '*ovToolbar' directive
		if (externalAdditionalButtons) {
			this.toolbarAdditionalButtonsTemplate = externalAdditionalButtons.template;
		}
	}

	/**
	 * @ignore
	 */
	@ContentChild(ToolbarAdditionalPanelButtonsDirective)
	set externalAdditionalPanelButtons(externalAdditionalPanelButtons: ToolbarAdditionalPanelButtonsDirective) {
		// This directive will has value only when ADDITIONAL PANEL BUTTONS component tagget with '*ovToolbarAdditionalPanelButtons' directive
		// is inside of the TOOLBAR component tagged with '*ovToolbar' directive
		if (externalAdditionalPanelButtons) {
			this.toolbarAdditionalPanelButtonsTemplate = externalAdditionalPanelButtons.template;
		}
	}

	/**
	 * Provides event notifications that fire when leave button has been clicked.
	 */
	@Output() onLeaveButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when camera toolbar button has been clicked.
	 */
	@Output() onCameraButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when microphone toolbar button has been clicked.
	 */
	@Output() onMicrophoneButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when fullscreen toolbar button has been clicked.
	 */
	@Output() onFullscreenButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when screenshare toolbar button has been clicked.
	 */
	@Output() onScreenshareButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when participants panel button has been clicked.
	 */
	@Output() onParticipantsPanelButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when chat panel button has been clicked.
	 */
	@Output() onChatPanelButtonClicked: EventEmitter<void> = new EventEmitter<any>();

	/**
	 * Provides event notifications that fire when activities panel button has been clicked.
	 */
	@Output() onActivitiesPanelButtonClicked: EventEmitter<void> = new EventEmitter<any>();
	/**
	 * Provides event notifications that fire when start recording button has been clicked.
	 */
	@Output() onStartRecordingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when start broadcasting button has been clicked.
	 */
	@Output() onStopBroadcastingClicked: EventEmitter<void> = new EventEmitter<void>();

	/**
	 * Provides event notifications that fire when stop recording button has been clicked.
	 */
	@Output() onStopRecordingClicked: EventEmitter<void> = new EventEmitter<void>();
	/**
	 * @ignore
	 */
	@ViewChild(MatMenuTrigger) public menuTrigger: MatMenuTrigger;

	/**
	 * @ignore
	 */
	session: Session;
	/**
	 * @ignore
	 */
	unreadMessages: number = 0;
	/**
	 * @ignore
	 */
	messageList: ChatMessage[] = [];
	/**
	 * @ignore
	 */
	isScreenShareActive: boolean;
	/**
	 * @ignore
	 */
	isWebcamVideoActive: boolean;
	/**
	 * @ignore
	 */
	isAudioActive: boolean;
	/**
	 * @ignore
	 */
	isConnectionLost: boolean;
	/**
	 * @ignore
	 */
	hasVideoDevices: boolean;
	/**
	 * @ignore
	 */
	hasAudioDevices: boolean;
	/**
	 * @ignore
	 */
	isFullscreenActive: boolean = false;
	/**
	 * @ignore
	 */
	isChatOpened: boolean = false;
	/**
	 * @ignore
	 */
	isParticipantsOpened: boolean = false;

	/**
	 * @ignore
	 */
	isActivitiesOpened: boolean = false;

	/**
	 * @ignore
	 */
	isMinimal: boolean = false;
	/**
	 * @ignore
	 */
	showScreenshareButton = true;
	/**
	 * @ignore
	 */
	showFullscreenButton: boolean = true;

	/**
	 * @ignore
	 */
	showBackgroundEffectsButton: boolean = true;

	/**
	 * @ignore
	 */
	showLeaveButton: boolean = true;

	/**
	 * @ignore
	 */
	showRecordingButton: boolean = true;

	/**
	 * @ignore
	 */
	showBroadcastingButton: boolean = true;

	/**
	 * @ignore
	 */
	showSettingsButton: boolean = true;

	/**
	 * @ignore
	 */
	showMoreOptionsButton: boolean = true;

	/**
	 * @ignore
	 */
	showParticipantsPanelButton: boolean = true;

	/**
	 * @ignore
	 */
	showActivitiesPanelButton: boolean = true;
	/**
	 * @ignore
	 */
	showChatPanelButton: boolean = true;
	/**
	 * @ignore
	 */
	showLogo: boolean = true;
	/**
	 * @ignore
	 */
	showSessionName: boolean = true;

	/**
	 * @ignore
	 */
	showCaptionsButton: boolean = true;

	/**
	 * @ignore
	 */
	captionsEnabled: boolean;

	/**
	 * @ignore
	 */
	videoMuteChanging: boolean = false;

	/**
	 * @ignore
	 */
	recordingStatus: RecordingStatus = RecordingStatus.STOPPED;

	/**
	 * @ignore
	 */
	broadcastingStatus: BroadcastingStatus = BroadcastingStatus.STOPPED;
	/**
	 * @ignore
	 */
	_recordingStatus = RecordingStatus;
	/**
	 * @ignore
	 */
	_broadcastingStatus = BroadcastingStatus;

	/**
	 * @ignore
	 */
	recordingTime: Date;
	/**
	 * @ignore
	 */
	broadcastingTime: Date;

	/**
	 * @ignore
	 */
	isSessionCreator: boolean = false;

	/**
	 * @ignore
	 */
	screenSize: string;

	private log: ILogger;
	private minimalSub: Subscription;
	private panelTogglingSubscription: Subscription;
	private chatMessagesSubscription: Subscription;
	private localParticipantSubscription: Subscription;
	private screenshareButtonSub: Subscription;
	private fullscreenButtonSub: Subscription;
	private backgroundEffectsButtonSub: Subscription;
	private leaveButtonSub: Subscription;
	private recordingButtonSub: Subscription;
	private broadcastingButtonSub: Subscription;
	private recordingSubscription: Subscription;
	private broadcastingSubscription: Subscription;
	private activitiesPanelButtonSub: Subscription;
	private participantsPanelButtonSub: Subscription;
	private chatPanelButtonSub: Subscription;
	private displayLogoSub: Subscription;
	private displaySessionNameSub: Subscription;
	private screenSizeSub: Subscription;
	private settingsButtonSub: Subscription;
	private captionsSubs: Subscription;
	private currentWindowHeight = window.innerHeight;

	/**
	 * @ignore
	 */
	constructor(
		protected documentService: DocumentService,
		protected chatService: ChatService,
		protected panelService: PanelService,
		protected participantService: ParticipantService,
		protected openviduService: OpenViduService,
		protected oVDevicesService: DeviceService,
		protected actionService: ActionService,
		protected loggerSrv: LoggerService,
		private layoutService: LayoutService,
		private cd: ChangeDetectorRef,
		private libService: OpenViduAngularConfigService,
		private platformService: PlatformService,
		private recordingService: RecordingService,
		private broadcastingService: BroadcastingService,
		private translateService: TranslateService,
		private storageSrv: StorageService
	) {
		this.log = this.loggerSrv.get('ToolbarComponent');
	}
	/**
	 * @ignore
	 */
	@HostListener('window:resize', ['$event'])
	sizeChange(event) {
		if (this.currentWindowHeight >= window.innerHeight) {
			// The user has exit the fullscreen mode
			this.isFullscreenActive = false;
			this.currentWindowHeight = window.innerHeight;
		}
	}

	/**
	 * @ignore
	 */
	@HostListener('document:keydown', ['$event'])
	keyDown(event: KeyboardEvent) {
		if (event.key === 'F11') {
			event.preventDefault();
			this.toggleFullscreen();
			this.currentWindowHeight = window.innerHeight;
			return false;
		}
	}

	async ngOnInit() {
		this.subscribeToToolbarDirectives();

		this.hasVideoDevices = this.oVDevicesService.hasVideoDeviceAvailable();
		this.hasAudioDevices = this.oVDevicesService.hasAudioDeviceAvailable();
		this.session = this.openviduService.getWebcamSession();

		this.subscribeToUserMediaProperties();
		this.subscribeToReconnection();
		this.subscribeToMenuToggling();
		this.subscribeToChatMessages();
		this.subscribeToRecordingStatus();
		this.subscribeToBroadcastingStatus();
		this.subscribeToScreenSize();
		this.subscribeToCaptionsToggling();
	}

	ngAfterViewInit() {
		// Sometimes the connection is undefined so we have to check the role when the mat menu is opened
		this.menuTrigger?.menuOpened.subscribe(() => {
			this.isSessionCreator = this.participantService.amIModerator();
		});
	}

	ngOnDestroy(): void {
		if (this.panelTogglingSubscription) this.panelTogglingSubscription.unsubscribe();
		if (this.chatMessagesSubscription) this.chatMessagesSubscription.unsubscribe();
		if (this.localParticipantSubscription) this.localParticipantSubscription.unsubscribe();
		if (this.screenshareButtonSub) this.screenshareButtonSub.unsubscribe();
		if (this.fullscreenButtonSub) this.fullscreenButtonSub.unsubscribe();
		if (this.backgroundEffectsButtonSub) this.backgroundEffectsButtonSub.unsubscribe();
		if (this.leaveButtonSub) this.leaveButtonSub.unsubscribe();
		if (this.recordingButtonSub) this.recordingButtonSub.unsubscribe();
		if (this.broadcastingButtonSub) this.broadcastingButtonSub.unsubscribe();
		if (this.participantsPanelButtonSub) this.participantsPanelButtonSub.unsubscribe();
		if (this.chatPanelButtonSub) this.chatPanelButtonSub.unsubscribe();
		if (this.displayLogoSub) this.displayLogoSub.unsubscribe();
		if (this.displaySessionNameSub) this.displaySessionNameSub.unsubscribe();
		if (this.minimalSub) this.minimalSub.unsubscribe();
		if (this.activitiesPanelButtonSub) this.activitiesPanelButtonSub.unsubscribe();
		if (this.recordingSubscription) this.recordingSubscription.unsubscribe();
		if (this.broadcastingSubscription) this.broadcastingSubscription.unsubscribe();
		if (this.screenSizeSub) this.screenSizeSub.unsubscribe();
		if (this.settingsButtonSub) this.settingsButtonSub.unsubscribe();
		if (this.captionsSubs) this.captionsSubs.unsubscribe();
	}

	/**
	 * @ignore
	 */
	async toggleMicrophone() {
		this.onMicrophoneButtonClicked.emit();
		try {
			this.participantService.publishAudio(!this.isAudioActive);
		} catch (error) {
			this.log.e('There was an error toggling microphone:', error.code, error.message);
			this.actionService.openDialog(
				this.translateService.translate('ERRORS.TOGGLE_MICROPHONE'),
				error?.error || error?.message || error
			);
		}
	}

	/**
	 * @ignore
	 */
	async toggleCamera() {
		this.videoMuteChanging = true;
		this.onCameraButtonClicked.emit();
		try {
			const publishVideo = !this.participantService.isMyVideoActive();
			if (this.panelService.isExternalPanelOpened() && !publishVideo) {
				this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
			}
			await this.openviduService.publishVideo(publishVideo);
		} catch (error) {
			this.log.e('There was an error toggling camera:', error.code, error.message);
			this.actionService.openDialog(this.translateService.translate('ERRORS.TOGGLE_CAMERA'), error?.error || error?.message || error);
		}
		this.videoMuteChanging = false;
	}

	/**
	 * @ignore
	 */
	async toggleScreenShare() {
		this.onScreenshareButtonClicked.emit();

		try {
			await this.openviduService.toggleScreenshare();
		} catch (error) {
			this.log.e('There was an error toggling screen share', error.code, error.message);
			if (error && error.name === 'SCREEN_SHARING_NOT_SUPPORTED') {
				this.actionService.openDialog(
					this.translateService.translate('ERRORS.SCREEN_SHARING'),
					this.translateService.translate('ERRORS.SCREEN_SUPPORT')
				);
			}
		}
	}

	/**
	 * @ignore
	 */
	leaveSession() {
		this.log.d('Leaving session...');
		this.openviduService.disconnect();
		this.onLeaveButtonClicked.emit();
	}

	/**
	 * @ignore
	 */
	toggleRecording() {
		if (this.recordingStatus === RecordingStatus.STARTED) {
			this.log.d('Stopping recording');
			this.onStopRecordingClicked.emit();
			this.recordingService.updateStatus(RecordingStatus.STOPPING);
		} else if (this.recordingStatus === RecordingStatus.STOPPED) {
			this.onStartRecordingClicked.emit();
			this.recordingService.updateStatus(RecordingStatus.STARTING);

			if (this.showActivitiesPanelButton && !this.isActivitiesOpened) {
				this.toggleActivitiesPanel('recording');
			}
		}
	}

	/**
	 * @ignore
	 */
	toggleBroadcasting() {
		if (this.broadcastingStatus === BroadcastingStatus.STARTED) {
			this.log.d('Stopping broadcasting');
			this.onStopBroadcastingClicked.emit();
			this.broadcastingService.updateStatus(BroadcastingStatus.STOPPING);
		} else if (this.broadcastingStatus === BroadcastingStatus.STOPPED) {
			if (this.showActivitiesPanelButton && !this.isActivitiesOpened) {
				this.toggleActivitiesPanel('broadcasting');
			}
		}
	}

	/**
	 * @ignore
	 */
	toggleBackgroundEffects() {
		if (this.openviduService.isOpenViduPro()) {
			this.panelService.togglePanel(PanelType.BACKGROUND_EFFECTS);
		} else {
			this.actionService.openProFeatureDialog(
				this.translateService.translate('PANEL.BACKGROUND.TITLE'),
				this.translateService.translate('PANEL.PRO_FEATURE')
			);
		}
	}

	/**
	 * @ignore
	 */
	toggleCaptions() {
		if (this.openviduService.isOpenViduPro()) {
			this.layoutService.toggleCaptions();
		} else {
			this.actionService.openProFeatureDialog(
				this.translateService.translate('PANEL.SETTINGS.CAPTIONS'),
				this.translateService.translate('PANEL.PRO_FEATURE')
			);
		}
	}

	/**
	 * @ignore
	 */
	toggleSettings() {
		this.panelService.togglePanel(PanelType.SETTINGS);
	}

	/**
	 * @ignore
	 */
	toggleParticipantsPanel() {
		this.onParticipantsPanelButtonClicked.emit();
		this.panelService.togglePanel(PanelType.PARTICIPANTS);
	}

	/**
	 * @ignore
	 */
	toggleChatPanel() {
		this.onChatPanelButtonClicked.emit();
		this.panelService.togglePanel(PanelType.CHAT);
	}

	/**
	 * @ignore
	 */
	toggleFullscreen() {
		this.isFullscreenActive = !this.isFullscreenActive;
		this.documentService.toggleFullscreen('session-container');
		this.onFullscreenButtonClicked.emit();
	}

	private toggleActivitiesPanel(expandPanel: string) {
		this.onActivitiesPanelButtonClicked.emit();
		this.panelService.togglePanel(PanelType.ACTIVITIES, expandPanel);
	}

	protected subscribeToReconnection() {
		this.session.on('reconnecting', () => {
			if (this.panelService.isPanelOpened()) {
				this.panelService.closePanel();
			}
			this.isConnectionLost = true;
		});
		this.session.on('reconnected', () => {
			this.isConnectionLost = false;
		});
	}
	protected subscribeToMenuToggling() {
		this.panelTogglingSubscription = this.panelService.panelOpenedObs.subscribe((ev: PanelEvent) => {
			this.isChatOpened = ev.opened && ev.type === PanelType.CHAT;
			this.isParticipantsOpened = ev.opened && ev.type === PanelType.PARTICIPANTS;
			this.isActivitiesOpened = ev.opened && ev.type === PanelType.ACTIVITIES;
			if (this.isChatOpened) {
				this.unreadMessages = 0;
			}
			this.cd.markForCheck();
		});
	}

	protected subscribeToChatMessages() {
		this.chatMessagesSubscription = this.chatService.messagesObs.pipe(skip(1)).subscribe((messages) => {
			if (!this.panelService.isChatPanelOpened()) {
				this.unreadMessages++;
			}
			this.messageList = messages;
			this.cd.markForCheck();
		});
	}
	protected subscribeToUserMediaProperties() {
		this.localParticipantSubscription = this.participantService.localParticipantObs.subscribe((p: ParticipantAbstractModel) => {
			if (p) {
				this.isWebcamVideoActive = p.isCameraVideoActive();
				this.isAudioActive = p.hasAudioActive();
				this.isScreenShareActive = p.isScreenActive();
				this.isSessionCreator = p.getRole() === OpenViduRole.MODERATOR;
				this.storageSrv.setAudioMuted(!this.isAudioActive);
				this.storageSrv.setVideoMuted(!this.isWebcamVideoActive);
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToRecordingStatus() {
		this.recordingSubscription = this.recordingService.recordingStatusObs.subscribe((ev?: { info: RecordingInfo; time?: Date }) => {
			if (ev) {
				this.recordingStatus = ev.info.status;

				if (ev?.time) {
					this.recordingTime = ev.time;
				}
				this.cd.markForCheck();
			}
		});
	}

	private subscribeToBroadcastingStatus() {
		this.broadcastingSubscription = this.broadcastingService.broadcastingStatusObs.subscribe(
			(ev: { status: BroadcastingStatus; time?: Date } | undefined) => {
				if (!!ev) {
					this.broadcastingStatus = ev.status;
					if (ev.time) {
						this.broadcastingTime = ev.time;
					}
					this.cd.markForCheck();
				}
			}
		);
	}

	private subscribeToToolbarDirectives() {
		this.minimalSub = this.libService.minimalObs.subscribe((value: boolean) => {
			this.isMinimal = value;
			this.cd.markForCheck();
		});
		this.screenshareButtonSub = this.libService.screenshareButtonObs.subscribe((value: boolean) => {
			this.showScreenshareButton = value && !this.platformService.isMobile();
			this.cd.markForCheck();
		});
		this.fullscreenButtonSub = this.libService.fullscreenButtonObs.subscribe((value: boolean) => {
			this.showFullscreenButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.leaveButtonSub = this.libService.leaveButtonObs.subscribe((value: boolean) => {
			this.showLeaveButton = value;
			this.cd.markForCheck();
		});

		this.recordingButtonSub = this.libService.recordingButtonObs.subscribe((value: boolean) => {
			this.showRecordingButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});

		this.broadcastingButtonSub = this.libService.broadcastingButtonObs.subscribe((value: boolean) => {
			this.showBroadcastingButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});

		this.settingsButtonSub = this.libService.toolbarSettingsButtonObs.subscribe((value: boolean) => {
			this.showSettingsButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.chatPanelButtonSub = this.libService.chatPanelButtonObs.subscribe((value: boolean) => {
			this.showChatPanelButton = value;
			this.cd.markForCheck();
		});
		this.participantsPanelButtonSub = this.libService.participantsPanelButtonObs.subscribe((value: boolean) => {
			this.showParticipantsPanelButton = value;
			this.cd.markForCheck();
		});
		this.activitiesPanelButtonSub = this.libService.activitiesPanelButtonObs.subscribe((value: boolean) => {
			this.showActivitiesPanelButton = value;
			this.cd.markForCheck();
		});
		this.backgroundEffectsButtonSub = this.libService.backgroundEffectsButton.subscribe((value: boolean) => {
			this.showBackgroundEffectsButton = value;
			this.checkDisplayMoreOptions();
			this.cd.markForCheck();
		});
		this.displayLogoSub = this.libService.displayLogoObs.subscribe((value: boolean) => {
			this.showLogo = value;
			this.cd.markForCheck();
		});
		this.displaySessionNameSub = this.libService.displaySessionNameObs.subscribe((value: boolean) => {
			this.showSessionName = value;
			this.cd.markForCheck();
		});
		this.captionsSubs = this.libService.captionsButtonObs.subscribe((value: boolean) => {
			this.showCaptionsButton = value;
			this.cd.markForCheck();
		});
	}

	private subscribeToScreenSize() {
		this.screenSizeSub = this.documentService.screenSizeObs.subscribe((change: MediaChange[]) => {
			this.screenSize = change[0].mqAlias;
			this.cd.markForCheck();
		});
	}

	private subscribeToCaptionsToggling() {
		this.captionsSubs = this.layoutService.captionsTogglingObs.subscribe((value: boolean) => {
			this.captionsEnabled = value;
			this.cd.markForCheck();
		});
	}

	private checkDisplayMoreOptions() {
		this.showMoreOptionsButton =
			this.showFullscreenButton ||
			this.showBackgroundEffectsButton ||
			this.showRecordingButton ||
			this.showBroadcastingButton ||
			this.showSettingsButton;
	}
}
