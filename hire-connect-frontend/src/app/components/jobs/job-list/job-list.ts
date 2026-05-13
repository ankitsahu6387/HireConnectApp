import { Component, OnInit } from '@angular/core';
import { JobService } from '../../../services/job.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-job-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './job-list.html'
})
export class JobListComponent implements OnInit {

  jobs: any[] = [];

  constructor(private jobService: JobService) {}

  ngOnInit() {
    this.jobService.getAllJobs().subscribe((data) => {
      this.jobs = data;
    });
  }
}