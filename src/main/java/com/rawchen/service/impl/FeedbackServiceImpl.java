package com.rawchen.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.rawchen.entity.Feedback;
import com.rawchen.mapper.FeedbackMapper;
import com.rawchen.service.FeedbackService;
import org.springframework.stereotype.Service;

@Service
public class FeedbackServiceImpl extends ServiceImpl<FeedbackMapper, Feedback> implements FeedbackService {

    @Override
    public Feedback createFeedback(Feedback feedback) {
        feedback.setStatus(0);
        save(feedback);
        return feedback;
    }

}
