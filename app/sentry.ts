import * as Sentry from '@sentry/browser';
import { CaptureConsole, Dedupe, Ember } from '@sentry/integrations';
import config from 'open-event-frontend/config/environment';

Sentry.init({
    integrations: [
        new Ember(),
        new Dedupe(),
        new CaptureConsole({
            levels: ['error']
        })
    ],
    beforeSend(event: Sentry.Event) {
        const exception = event.exception?.values?.[0];
        const errorValue = exception?.value;
        if (errorValue?.includes("Ember Data Request")) {
            if (errorValue?.includes("404")) {
                // Ignore 404 errors from Ember Data because 
                // I don't know how to turn them off
                return null;
            }
        }

        if (errorValue?.includes("TransitionAborted") && 
            exception?.mechanism?.handled) {
            // Every page load has a handled TransitionAborted for some reason
            return null;
        }

        return event;
    },
    ...config.sentry
});

Sentry.configureScope(function(scope) {
    function addAdapterError(error: any, event: Sentry.Event) {
        if (error.isAdapterError) {
            event.extra = {
                ...event.extra,
                adapter_errors: error.errors,
                adapter_errors_json: JSON.stringify(error.errors)
            }
        }
    }

    scope.addEventProcessor(function(event: Sentry.Event, hints: Sentry.EventHint) {
        addAdapterError(hints.originalException, event);

        const args: any[] = event.extra?.arguments || [];
        for (const arg of args) {
            addAdapterError(arg, event);
        }
      return event;
    });
});
