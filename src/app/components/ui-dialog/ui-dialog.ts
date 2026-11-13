import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { UiDialogService } from '../../services/ui-dialog/ui-dialog';
@Component({
  changeDetection: ChangeDetectionStrategy.Eager,
  selector: 'app-ui-dialog',
  standalone: true,
  imports: [],
  templateUrl: './ui-dialog.html',
  styleUrl: './ui-dialog.css'
})
export class UiDialog {
  readonly dialogs = inject(UiDialogService);
}
