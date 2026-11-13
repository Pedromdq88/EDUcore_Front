import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AnnouncementService } from '../../services/announcements/announcements';
interface PrivateNotice {
  id: string;
  title: string;
  content: string;
  category: string;
}
@Component({
  selector: 'app-private-student-announcement',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './private-student-announcement.html',
  styleUrl: './private-student-announcement.css'
})
export class PrivateStudentAnnouncement implements OnChanges {
  private readonly announcements = inject(AnnouncementService);
  @Input({
    required: true
  })
  studentId = '';
  @Input()
  studentName = '';
  @Input()
  notice: PrivateNotice | null = null;
  @Output()
  closed = new EventEmitter<void>();
  @Output()
  sent = new EventEmitter<void>();
  title = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(255)]
  });
  content = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(8), Validators.maxLength(20000)]
  });
  category = new FormControl('IMPORTANTE', {
    nonNullable: true,
    validators: [Validators.required]
  });
  form = new FormGroup({
    title: this.title,
    content: this.content,
    category: this.category
  });
  busy = signal(false);
  error = signal('');
  get isEditing(): boolean {
    return !!this.notice?.id;
  }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['notice']) {
      this.form.reset({
        title: this.notice?.title || '',
        content: this.notice?.content || '',
        category: this.notice?.category || 'IMPORTANTE'
      });
      this.error.set('');
    }
  }
  save(): void {
    if (this.busy())
      return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.error.set('');
    this.busy.set(true);
    const data = this.form.getRawValue();
    const request = this.notice?.id
      ? this.announcements.updatePrivateStudentAnnouncement(this.studentId, this.notice.id, data)
      : this.announcements.createPrivateStudentAnnouncement(this.studentId, data);
    request
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.sent.emit();
        },
        error: e => {
          this.busy.set(false);
          this.error.set(e?.error?.detail || e?.error?.message || 'No se pudo enviar el aviso privado.');
        }
      });
  }
}
