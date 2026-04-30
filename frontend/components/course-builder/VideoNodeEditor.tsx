'use client';

import { AUTHORING_LIMITS } from '@/src/domain/contentLimits';
import type { VideoNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { VideoEmbed } from '@/components/renderers/VideoEmbed';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { RichFormatSelect } from '@/components/course-builder/RichFormatSelect';
import { CountedTextAreaField } from '@/components/ui/CountedTextAreaField';
import { Input } from '@/components/ui/Input';

export function VideoNodeEditor(props: {
  payload: VideoNodePayload;
  onChange: (payload: VideoNodePayload) => void;
}) {
  return (
    <div className="stack-lg">
      <div className="video-editor-workbench fade-in-panel">
        <section className="studio-form-card stack-lg video-editor-pane">
          <div className="stack" style={{ gap: 8 }}>
            <div className="field-label">Video source</div>
            <p className="muted" style={{ margin: 0 }}>
              Paste a YouTube, Vimeo, Google Drive, OneDrive, SharePoint, Loom, Dropbox, or direct video file URL. If the host allows safe embedding, the playable preview appears below this source block.
            </p>
          </div>

          <label className="field">
            <span className="field-label">Video URL</span>
            <Input
              value={props.payload.videoUrl}
              onChange={(event) => props.onChange({ ...props.payload, videoUrl: event.target.value })}
              placeholder="https://drive.google.com/file/d/.../view or https://onedrive.live.com/..."
            />
          </label>
        </section>

        <ScrollablePreviewPanel
          className="video-preview-stage"
          label="Video preview"
          description="Embedded or linked video preview kept inside a large creator stage."
          maxHeight={720}
          minHeight={460}
          tone="media"
          fullScreenTitle="Video preview"
          bodyClassName="preview-body-tight video-preview-body"
          fullScreenBodyClassName="fullscreen-node-stage video-preview-body"
          immersive
        >
          <VideoEmbed url={props.payload.videoUrl} title="Video node preview" />
        </ScrollablePreviewPanel>
      </div>

      <div className="video-notes-workbench fade-in-panel">
        <section className="studio-form-card stack-lg video-notes-pane">
          <div className="grid-2">
            <RichFormatSelect value={props.payload.format} onChange={(format) => props.onChange({ ...props.payload, format })} />
            <div className="card stack" style={{ gap: 10 }}>
              <div className="field-label">Notes guidance</div>
              <p className="muted" style={{ margin: 0 }}>
                Notes can stay in markdown or LaTeX. The preview stage reuses the shared rich content renderer and stays large enough for real reading.
              </p>
            </div>
          </div>

          <CountedTextAreaField
            label="Notes below video"
            value={props.payload.note}
            onChange={(value) => props.onChange({ ...props.payload, note: value })}
            rows={14}
            className="studio-code-area"
            limit={AUTHORING_LIMITS.videoNote}
          />
        </section>

        <ScrollablePreviewPanel
          className="video-notes-preview-stage"
          label="Notes preview"
          description="Scrollable preview of the note block shown underneath the learner video experience."
          maxHeight={720}
          minHeight={520}
          tone={props.payload.format === 'latex' ? 'document' : 'default'}
          fullScreenTitle="Video notes preview"
          immersive
          fullScreenBodyClassName="fullscreen-node-stage"
        >
          <RichContentRenderer format={props.payload.format} content={props.payload.note} />
        </ScrollablePreviewPanel>
      </div>
    </div>
  );
}


